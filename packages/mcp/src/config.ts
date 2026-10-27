/**
 * Validated local config reader/writer for the Shubur MCP server and CLI.
 * Private signing material stays in a mode-0600 file under .avatar-gateway/.
 */

import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isIP } from "node:net";
import { z } from "zod";

export const CONFIG_DIR = ".avatar-gateway";
export const CONFIG_FILE = ".avatar-gateway/config.json";

const configSchema = z.object({
  gatewayUrl: z.string().url(),
  mode: z.enum(["self_hosted", "hosted"]),
  tenantApiKey: z.string().min(1).optional(),
  siteDid: z.string().startsWith("did:key:").optional(),
  sitePrivateKeyPem: z.string().includes("PRIVATE KEY").optional(),
  sitePublicKeyPem: z.string().includes("PUBLIC KEY").optional(),
  avatarDid: z.string().startsWith("did:key:").optional(),
  avatarPrivateKeyPem: z.string().includes("PRIVATE KEY").optional(),
  avatarPublicKeyPem: z.string().includes("PUBLIC KEY").optional(),
  avatarName: z.string().min(1).max(100).optional(),
  aiProviderEnvVar: z.string().regex(/^[A-Z_][A-Z0-9_]*$/).optional(),
  aiProvider: z.enum(["openai", "anthropic", "openai_compatible"]).optional(),
  shuburHandle: z.string().max(255).optional(),
  siteOrigin: z.string().url().optional(),
  backendUrl: z.string().min(1).optional(),
});

export type AvatarGatewayConfig = z.infer<typeof configSchema>;

export function validateGatewayUrl(value: string, mode: AvatarGatewayConfig["mode"]): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Gateway URL must be a valid absolute URL.");
  }
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "::1";
  if (url.username || url.password || url.search || url.hash) throw new Error("Gateway URL must not contain credentials, query, or fragment.");
  if (url.protocol !== "https:" && !(mode === "self_hosted" && isLoopback && url.protocol === "http:")) {
    throw new Error("Gateway URL must use HTTPS (HTTP is allowed only for a loopback self-hosted gateway).");
  }
  return url.toString().replace(/\/$/, "");
}

export function validateSiteOrigin(value: string, mode: AvatarGatewayConfig["mode"] = "self_hosted"): string {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("Site origin must be a valid absolute URL."); }
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]" || url.hostname === "::1";
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Site origin must be an origin without credentials, path, query, or fragment.");
  }
  if (mode === "hosted" && (url.protocol !== "https:" || isLoopback || isIP(url.hostname) !== 0)) {
    throw new Error("Hosted mode requires a non-loopback HTTPS site origin using a DNS hostname.");
  }
  if (url.protocol !== "https:" && !(mode === "self_hosted" && isLoopback && url.protocol === "http:")) {
    throw new Error("Site origin must use HTTPS unless it points to loopback.");
  }
  return url.origin;
}

function parseConfig(raw: string): AvatarGatewayConfig {
  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid .avatar-gateway/config.json: malformed JSON.");
  }
  const parsed = configSchema.safeParse(json);
  if (!parsed.success) throw new Error(`Invalid .avatar-gateway/config.json: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`);
  validateGatewayUrl(parsed.data.gatewayUrl, parsed.data.mode);
  if (parsed.data.siteOrigin) validateSiteOrigin(parsed.data.siteOrigin, parsed.data.mode);
  return parsed.data;
}

export async function readConfig(cwd = process.cwd()): Promise<AvatarGatewayConfig | null> {
  let raw: string;
  try {
    raw = await readFile(join(cwd, CONFIG_FILE), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  return parseConfig(raw);
}

export async function writeConfig(config: AvatarGatewayConfig, cwd = process.cwd()): Promise<void> {
  const validated = parseConfig(JSON.stringify(config));
  const dir = join(cwd, CONFIG_DIR);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const target = join(cwd, CONFIG_FILE);
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, target);
}

export async function mergeConfig(updates: Partial<AvatarGatewayConfig>, cwd = process.cwd()): Promise<AvatarGatewayConfig> {
  const existing = await readConfig(cwd) ?? { gatewayUrl: "http://localhost:4100", mode: "self_hosted" as const };
  const merged = configSchema.parse({ ...existing, ...updates });
  validateGatewayUrl(merged.gatewayUrl, merged.mode);
  await writeConfig(merged, cwd);
  return merged;
}
