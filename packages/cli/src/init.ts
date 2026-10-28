/** Shubur CLI setup: framework detection, secure identity/config, apartment, and profile draft. */

import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { isIP } from "node:net";
import { createInterface } from "node:readline/promises";
import { generateIdentity, signGatewayRequest } from "@avatar-gateway/gateway";
import { buildScaffold, detectFramework } from "./detect.js";
import type { DetectedFramework } from "./detect.js";

export type GatewayMode = "self_hosted" | "hosted";
export type AiProvider = "openai" | "anthropic" | "openai_compatible" | "mock";

export interface InitOptions {
  yes?: boolean;
  mode?: GatewayMode;
  gatewayUrl?: string;
  tenantApiKey?: string;
  avatarName?: string;
  siteOrigin?: string;
  aiProvider?: AiProvider;
  aiProviderEnvVar?: string;
  backendPath?: string;
  /** Tests and offline scaffolding may opt out; the public CLI installs by default. */
  installPackages?: boolean;
  /** Tests can disable the optional gateway registration attempt. */
  connectGateway?: boolean;
  installer?: (packages: string[], cwd: string) => Promise<void>;
}

export interface InitResult {
  framework: DetectedFramework;
  siteDid: string;
  avatarDid: string;
  avatarName: string;
  mode: GatewayMode;
  gatewayUrl: string;
  filesWritten: string[];
  packagesInstalled: boolean;
  profilePublished: boolean;
}

interface LocalConfig extends Record<string, unknown> {
  gatewayUrl: string;
  mode: GatewayMode;
  siteDid?: string;
  sitePrivateKeyPem?: string;
  sitePublicKeyPem?: string;
  avatarDid?: string;
  avatarPrivateKeyPem?: string;
  avatarPublicKeyPem?: string;
  lifeStartedAt?: string;
  avatarName?: string;
  aiProvider?: AiProvider;
  aiProviderEnvVar?: string;
  shuburHandle?: string;
  backendUrl?: string;
  tenantApiKey?: string;
  siteOrigin?: string;
}

const PROVIDER_ENV: Record<AiProvider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai_compatible: "OPENAI_API_KEY",
  mock: "OPENAI_API_KEY",
};

function isLoopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function validateGatewayUrl(value: string, mode: GatewayMode): string {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("Gateway URL must be an absolute URL."); }
  const localHttp = mode === "self_hosted" && url.protocol === "http:" && isLoopback(url.hostname);
  if (url.username || url.password || url.search || url.hash) throw new Error("Gateway URL cannot contain credentials, query parameters, or a fragment.");
  if (url.protocol !== "https:" && !localHttp) throw new Error("Use HTTPS for remote gateways. HTTP is allowed only for a local self-hosted gateway.");
  if (mode === "hosted" && url.protocol !== "https:") throw new Error("Hosted mode requires an HTTPS gateway URL.");
  return url.toString().replace(/\/$/, "");
}

function validateSiteOrigin(value: string, mode: GatewayMode): string {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("Site origin must be an absolute URL."); }
  const localHttp = mode === "self_hosted" && url.protocol === "http:" && isLoopback(url.hostname);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Site origin must be an origin without credentials, path, query, or fragment.");
  if (mode === "hosted" && (url.protocol !== "https:" || isLoopback(url.hostname) || isIP(url.hostname) !== 0)) {
    throw new Error("Hosted mode requires a non-loopback HTTPS site origin using a DNS hostname.");
  }
  if (url.protocol !== "https:" && !localHttp) throw new Error("Site origin must use HTTPS unless it points to loopback.");
  return url.origin;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "avatar";
}

async function readExistingConfig(path: string): Promise<LocalConfig | undefined> {
  let raw: string;
  try { raw = await readFile(path, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; }
  catch { throw new Error(`${path} exists but is invalid JSON; it was left untouched.`); }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error(`${path} exists but is not a config object; it was left untouched.`);
  const value = parsed as Record<string, unknown>;
  if (typeof value.gatewayUrl !== "string" || (value.mode !== "self_hosted" && value.mode !== "hosted")) {
    throw new Error(`${path} exists but does not contain a valid gatewayUrl and mode; it was left untouched.`);
  }
  if (value.lifeStartedAt !== undefined && (typeof value.lifeStartedAt !== "string" || !Number.isFinite(new Date(value.lifeStartedAt).getTime()))) {
    throw new Error(`${path} contains an invalid lifeStartedAt; it was left untouched.`);
  }
  return value as LocalConfig;
}

async function writeSecureConfig(path: string, config: LocalConfig): Promise<void> {
  const dir = join(path, "..");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
}

async function writeIfAbsent(cwd: string, relPath: string, content: string): Promise<boolean> {
  const absolute = join(cwd, relPath);
  await mkdir(join(absolute, ".."), { recursive: true });
  try {
    await writeFile(absolute, content, { encoding: "utf8", flag: "wx", mode: relPath.startsWith(".avatar-gateway/") ? 0o600 : 0o644 });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
}

async function ensureGitignore(cwd: string): Promise<boolean> {
  const path = join(cwd, ".gitignore");
  let current = "";
  try { current = await readFile(path, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const required = [".avatar-gateway/", ".env", ".env.*", "!.env.example"];
  const missing = required.filter((line) => !current.split(/\r?\n/).includes(line));
  if (!missing.length) return false;
  await writeFile(path, `${current.trimEnd()}${current ? "\n" : ""}\n# Shubur local identity and environment secrets\n${missing.join("\n")}\n`, { mode: 0o644 });
  return true;
}

async function runNpmInstall(packages: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolveInstall, rejectInstall) => {
    const child = spawn("npm", ["install", ...packages], { cwd, stdio: "inherit" });
    child.once("error", rejectInstall);
    child.once("exit", (code) => code === 0 ? resolveInstall() : rejectInstall(new Error(`npm install exited with code ${code ?? "unknown"}`)));
  });
}

async function writeGatewayScript(cwd: string): Promise<boolean> {
  const path = join(cwd, "package.json");
  let parsed: unknown;
  try { parsed = JSON.parse(await readFile(path, "utf8")) as unknown; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new Error("Could not update package.json with the Shubur gateway script.");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("package.json must contain an object.");
  const pkg = parsed as Record<string, unknown>;
  const scripts = typeof pkg.scripts === "object" && pkg.scripts !== null ? { ...(pkg.scripts as Record<string, unknown>) } : {};
  if (scripts["shubur:gateway"]) return false;
  scripts["shubur:gateway"] = "avatar-gateway-server";
  pkg.scripts = scripts;
  await writeFile(path, `${JSON.stringify(pkg, null, 2)}\n`);
  return true;
}

async function ensurePackageManifest(cwd: string): Promise<boolean> {
  const path = join(cwd, "package.json");
  try {
    await readFile(path, "utf8");
    return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const name = slug(basename(cwd));
  await writeFile(path, `${JSON.stringify({ name, version: "0.1.0", private: true }, null, 2)}\n`, { flag: "wx", mode: 0o644 });
  return true;
}

async function writeDevScript(cwd: string): Promise<boolean> {
  const path = join(cwd, "package.json");
  let parsed: unknown;
  try { parsed = JSON.parse(await readFile(path, "utf8")) as unknown; }
  catch { throw new Error("Could not update package.json with the Shubur dev script."); }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("package.json must contain an object.");
  const pkg = parsed as Record<string, unknown>;
  const scripts = typeof pkg.scripts === "object" && pkg.scripts !== null ? { ...(pkg.scripts as Record<string, unknown>) } : {};
  if (scripts.dev) return false;
  scripts.dev = "vite --host 127.0.0.1";
  pkg.scripts = scripts;
  await writeFile(path, `${JSON.stringify(pkg, null, 2)}\n`);
  return true;
}

async function tryPublishProfile(config: LocalConfig, origin: string): Promise<boolean> {
  const base = config.gatewayUrl;
  const headers = new Headers({ "content-type": "application/json" });
  if (typeof config.tenantApiKey === "string") headers.set("x-tenant-key", config.tenantApiKey);
  let health: Response;
  try {
    health = await fetch(new URL("/health", base), { headers, redirect: "error", signal: AbortSignal.timeout(1_500) });
  } catch { return false; }
  if (!health.ok) return false;

  const register = async (path: string, method: string, body: unknown, asAgent = false): Promise<void> => {
    const bodyText = JSON.stringify(body);
    const requestHeaders = new Headers(headers);
    const signingKey = asAgent ? config.avatarPrivateKeyPem : config.sitePrivateKeyPem;
    if (!signingKey) throw new Error(`${asAgent ? "Avatar" : "Site"} signing identity is missing from local config.`);
    const signatureHeaders = signGatewayRequest(method, path, bodyText, signingKey);
    for (const [name, value] of Object.entries(signatureHeaders)) requestHeaders.set(name, value);
    if (asAgent) requestHeaders.set("x-ag-agent-did", config.avatarDid ?? "");
    else requestHeaders.set("x-ag-site-did", config.siteDid ?? "");
    const response = await fetch(new URL(path, base), {
      method,
      headers: requestHeaders,
      body: bodyText,
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Gateway registration failed (${response.status}) at ${path}.`);
  };
  await register("/v1/sites", "POST", {
    site_did: config.siteDid,
    origin,
    display_name: new URL(origin).hostname,
    public_key_pem: config.sitePublicKeyPem,
    backend_url: `${origin}${config.backendUrl ?? "/avatar-gateway"}`,
  });
  await register(`/v1/sites/${encodeURIComponent(config.siteDid ?? "")}/avatars`, "POST", {
    avatar_did: config.avatarDid,
    name: config.avatarName,
    public_key_pem: config.avatarPublicKeyPem,
    public_bio: "",
    look: { style: "brick-minifig" },
  });
  await register(`/v1/agents/${encodeURIComponent(config.avatarDid ?? "")}/profile`, "PUT", {
    name: config.avatarName,
    public_bio: "",
    follow_policy: "open",
    dm_policy: "request",
  }, true);
  return true;
}

export async function runInit(opts: InitOptions = {}, cwd = process.cwd()): Promise<InitResult> {
  const isYes = opts.yes ?? false;
  let rl: ReturnType<typeof createInterface> | undefined;
  async function ask(prompt: string, defaultValue: string): Promise<string> {
    if (isYes) return defaultValue;
    if (!rl) rl = createInterface({ input: process.stdin, output: process.stdout });
    return (await rl.question(`${prompt}${defaultValue ? ` [${defaultValue}]` : ""}: `)).trim() || defaultValue;
  }

  const framework = await detectFramework(cwd);
  const detectedFramework = framework === "unknown" ? "plain-html" : framework;
  const configDir = join(cwd, ".avatar-gateway");
  const configPath = join(configDir, "config.json");
  const currentConfig = await readExistingConfig(configPath);
  if (currentConfig) validateGatewayUrl(currentConfig.gatewayUrl, currentConfig.mode);
  if (!isYes) process.stdout.write(`\nShubur quick setup\n\nDetected framework: ${detectedFramework}\n\n`);

  const mode = opts.mode ?? (await ask("Gateway mode? (self_hosted / hosted)", currentConfig?.mode ?? "self_hosted")) as GatewayMode;
  if (mode !== "self_hosted" && mode !== "hosted") throw new Error("Gateway mode must be self_hosted or hosted.");
  const gatewayDefault = mode === "self_hosted" ? "http://localhost:4100" : "";
  const gatewayAnswer = opts.gatewayUrl ?? await ask(mode === "hosted" ? "HTTPS Shubur Cloud or gateway URL" : "Local gateway URL", currentConfig?.gatewayUrl ?? gatewayDefault);
  if (!gatewayAnswer) throw new Error("Hosted mode needs an HTTPS gateway URL. Shubur Cloud is coming soon.");
  const gatewayUrl = validateGatewayUrl(gatewayAnswer, mode);
  const tenantApiKey = opts.tenantApiKey ?? currentConfig?.tenantApiKey ?? (mode === "hosted" ? await ask("Tenant API key", "") : undefined);
  if (mode === "hosted" && !tenantApiKey) throw new Error("Hosted mode requires a tenant API key.");

  const avatarName = opts.avatarName ?? await ask("Avatar name", currentConfig?.avatarName ?? "My Avatar");
  if (!avatarName.trim() || avatarName.length > 100) throw new Error("Avatar name must contain 1–100 characters.");
  const backendPath = opts.backendPath ?? await ask("Same-origin avatar backend path", currentConfig?.backendUrl ?? "/avatar-gateway");
  if (!backendPath.startsWith("/") || backendPath.startsWith("//") || backendPath.includes("\\")) {
    throw new Error("Backend path must be a same-origin absolute path such as /avatar-gateway.");
  }
  const defaultOrigin = detectedFramework === "nextjs" ? "http://localhost:3000" : detectedFramework.includes("vite") ? "http://localhost:5173" : "http://localhost:8080";
  const existingOrigin = currentConfig?.siteOrigin;
  const suggestedOrigin = mode === "hosted"
    ? (existingOrigin?.startsWith("https://") ? existingOrigin : "")
    : (existingOrigin ?? defaultOrigin);
  const siteOriginAnswer = opts.siteOrigin ?? await ask("Site origin", suggestedOrigin);
  if (mode === "hosted" && !siteOriginAnswer) throw new Error("Hosted mode requires a non-loopback HTTPS site origin using a DNS hostname.");
  const siteOrigin = validateSiteOrigin(siteOriginAnswer, mode);
  const aiProvider = opts.aiProvider ?? (await ask("AI provider (openai / anthropic / openai_compatible)", currentConfig?.aiProvider ?? "openai")) as AiProvider;
  if (!(["openai", "anthropic", "openai_compatible"] as string[]).includes(aiProvider)) throw new Error("Unsupported AI provider.");
  const aiProviderEnvVar = opts.aiProviderEnvVar ?? await ask("API key environment variable", currentConfig?.aiProviderEnvVar ?? PROVIDER_ENV[aiProvider]);
  if (!/^[A-Z_][A-Z0-9_]*$/.test(aiProviderEnvVar)) throw new Error("Environment variable name is invalid.");
  rl?.close();

  const hasAnySiteIdentityPart = Boolean(currentConfig?.siteDid || currentConfig?.sitePrivateKeyPem || currentConfig?.sitePublicKeyPem);
  const hasCompleteSiteIdentity = Boolean(currentConfig?.siteDid && currentConfig.sitePrivateKeyPem && currentConfig.sitePublicKeyPem);
  const hasAnyAvatarIdentityPart = Boolean(currentConfig?.avatarDid || currentConfig?.avatarPrivateKeyPem || currentConfig?.avatarPublicKeyPem);
  const hasCompleteAvatarIdentity = Boolean(currentConfig?.avatarDid && currentConfig.avatarPrivateKeyPem && currentConfig.avatarPublicKeyPem);
  if (hasAnySiteIdentityPart && !hasCompleteSiteIdentity) throw new Error("Existing site identity is incomplete; it was left unchanged.");
  if (hasAnyAvatarIdentityPart && !hasCompleteAvatarIdentity) throw new Error("Existing avatar identity is incomplete; it was left unchanged.");
  const siteIdentity = hasCompleteSiteIdentity
    ? { did: currentConfig!.siteDid!, privateKeyPem: currentConfig!.sitePrivateKeyPem!, publicKeyPem: currentConfig!.sitePublicKeyPem! }
    : generateIdentity();
  const avatarIdentity = hasCompleteAvatarIdentity
    ? { did: currentConfig!.avatarDid!, privateKeyPem: currentConfig!.avatarPrivateKeyPem!, publicKeyPem: currentConfig!.avatarPublicKeyPem! }
    : generateIdentity();
  const chosenName = avatarName;
  const lifeStartedAt = currentConfig?.lifeStartedAt ?? new Date().toISOString();
  const handleHost = new URL(gatewayUrl).hostname;
  const config: LocalConfig = {
    ...currentConfig,
    gatewayUrl,
    mode,
    ...(tenantApiKey ? { tenantApiKey } : {}),
    siteDid: siteIdentity.did,
    sitePrivateKeyPem: siteIdentity.privateKeyPem,
    sitePublicKeyPem: siteIdentity.publicKeyPem,
    avatarDid: avatarIdentity.did,
    avatarPrivateKeyPem: avatarIdentity.privateKeyPem,
    avatarPublicKeyPem: avatarIdentity.publicKeyPem,
    lifeStartedAt,
    avatarName: chosenName,
    aiProvider,
    aiProviderEnvVar,
    shuburHandle: currentConfig?.shuburHandle ?? `${slug(chosenName)}@${handleHost}`,
    backendUrl: backendPath,
    siteOrigin,
  };
  if (mode === "hosted") config.tenantApiKey = tenantApiKey;
  else delete config.tenantApiKey;

  const scaffold = buildScaffold(detectedFramework, chosenName, backendPath, { agentId: avatarIdentity.did, startedAt: lifeStartedAt });
  const filesWritten: string[] = [];
  for (const [relPath, content] of Object.entries(scaffold.files)) {
    if (await writeIfAbsent(cwd, relPath, content)) filesWritten.push(relPath);
  }
  await mkdir(configDir, { recursive: true, mode: 0o700 });
  await chmod(configDir, 0o700);
  await writeSecureConfig(configPath, config);
  filesWritten.push(".avatar-gateway/config.json");

  const publicProfile = {
    did: avatarIdentity.did,
    handle: config.shuburHandle,
    name: chosenName,
    publicBio: "",
    followPolicy: "open",
    dmPolicy: "request",
  };
  if (await writeIfAbsent(cwd, ".avatar-gateway/profile.json", `${JSON.stringify(publicProfile, null, 2)}\n`)) {
    await chmod(join(configDir, "profile.json"), 0o600);
    filesWritten.push(".avatar-gateway/profile.json");
  }
  if (await writeIfAbsent(cwd, ".env.example", `${aiProviderEnvVar}=\n${aiProvider === "openai_compatible" ? "OPENAI_BASE_URL=http://localhost:11434/v1\nOPENAI_MODEL=llama3\n" : ""}`)) filesWritten.push(".env.example");
  if (await ensureGitignore(cwd)) filesWritten.push(".gitignore");

  let packagesInstalled = false;
  if (opts.installPackages !== false) {
    if (await ensurePackageManifest(cwd)) filesWritten.push("package.json");
    await (opts.installer ?? runNpmInstall)(scaffold.packages, cwd);
    packagesInstalled = true;
    if (detectedFramework === "plain-html" && await writeDevScript(cwd) && !filesWritten.includes("package.json")) {
      filesWritten.push("package.json");
    }
    if (await writeGatewayScript(cwd) && !filesWritten.includes("package.json")) filesWritten.push("package.json");
  }

  let profilePublished = false;
  if (opts.connectGateway !== false) profilePublished = await tryPublishProfile(config, siteOrigin);

  if (!isYes) {
    process.stdout.write("\nShubur setup is ready.\n\n");
    process.stdout.write(`  Framework: ${detectedFramework}\n  Avatar: ${chosenName}\n  Site DID: ${siteIdentity.did}\n  Shubur profile: ${profilePublished ? "registered" : "saved locally as a profile draft"}\n`);
    if (!profilePublished) process.stdout.write("  Gateway: start it with `npm run shubur:gateway`, then register the profile with Shubur.\n");
    process.stdout.write(`  Provider key: set ${aiProviderEnvVar} in your environment; it is not written to the project.\n`);
    if (!packagesInstalled) process.stdout.write(`  Install packages: npm install ${scaffold.packages.join(" ")}\n`);
    process.stdout.write("\nNext: open the generated apartment page and set your provider key before enabling owner chat.\n\n");
  }

  return {
    framework: detectedFramework,
    siteDid: siteIdentity.did,
    avatarDid: avatarIdentity.did,
    avatarName: chosenName,
    mode,
    gatewayUrl,
    filesWritten,
    packagesInstalled,
    profilePublished,
  };
}

export function formatInitSummary(result: InitResult): string {
  return [
    `Shubur setup ready for ${result.avatarName} (${result.framework}).`,
    `Site DID: ${result.siteDid}`,
    `Avatar DID: ${result.avatarDid}`,
    `Gateway: ${result.gatewayUrl} (${result.mode})`,
    `Packages installed: ${result.packagesInstalled ? "yes" : "no"}`,
    `Profile: ${result.profilePublished ? "registered with gateway" : "saved locally as .avatar-gateway/profile.json"}`,
    result.framework === "plain-html" ? "Next: run npm run dev to open the generated Starter Apartment." : "Next: open the generated Shubur apartment page.",
  ].join("\n");
}
