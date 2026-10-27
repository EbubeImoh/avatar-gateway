/**
 * Local config file reader/writer for the avatar-gateway MCP server and CLI.
 * Config is stored in .avatar-gateway/config.json in the current working dir.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export const CONFIG_DIR = ".avatar-gateway";
export const CONFIG_FILE = ".avatar-gateway/config.json";

export interface AvatarGatewayConfig {
  /** Gateway base URL. "https://gateway.avatar-gateway.dev" for hosted, or self-hosted URL. */
  gatewayUrl: string;
  /** "self_hosted" | "hosted" */
  mode: "self_hosted" | "hosted";
  /** API key for hosted mode (tenant key). */
  tenantApiKey?: string;
  /** Site DID generated for this project. */
  siteDid?: string;
  /** Site private key PEM (base64, kept local). */
  sitePrivateKeyPem?: string;
  /** Site public key PEM. */
  sitePublicKeyPem?: string;
  /** Primary avatar DID. */
  avatarDid?: string;
  /** Primary avatar name. */
  avatarName?: string;
  /** AI provider key env var name (never stored directly). */
  aiProviderEnvVar?: string;
  /** AI provider type: "openai" | "anthropic" | "openai_compatible". */
  aiProvider?: string;
  /** Shubur handle (name@domain). */
  shuburHandle?: string;
  /** Backend URL (where the avatar-gateway SDK is mounted). */
  backendUrl?: string;
}

export async function readConfig(cwd = process.cwd()): Promise<AvatarGatewayConfig | null> {
  try {
    const raw = await readFile(join(cwd, CONFIG_FILE), "utf8");
    return JSON.parse(raw) as AvatarGatewayConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(config: AvatarGatewayConfig, cwd = process.cwd()): Promise<void> {
  await mkdir(join(cwd, CONFIG_DIR), { recursive: true });
  await writeFile(join(cwd, CONFIG_FILE), JSON.stringify(config, null, 2) + "\n");
}

export async function mergeConfig(updates: Partial<AvatarGatewayConfig>, cwd = process.cwd()): Promise<AvatarGatewayConfig> {
  const existing = await readConfig(cwd) ?? { gatewayUrl: "http://localhost:4100", mode: "self_hosted" };
  const merged = { ...existing, ...updates } as AvatarGatewayConfig;
  await writeConfig(merged, cwd);
  return merged;
}
