/**
 * avatar-gateway MCP tool implementations.
 * Each function is called by the MCP server's tool dispatcher.
 */

import { generateIdentity } from "@avatar-gateway/gateway";
import { readConfig, writeConfig, mergeConfig } from "./config.js";
import type { AvatarGatewayConfig } from "./config.js";

// ── Gateway API helpers ────────────────────────────────────────────────────

async function gatewayFetch(
  config: AvatarGatewayConfig,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const url = `${config.gatewayUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> ?? {}),
  };
  if (config.tenantApiKey) headers["x-tenant-key"] = config.tenantApiKey;

  const res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gateway error ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Tool: status ───────────────────────────────────────────────────────────

export async function toolStatus(cwd: string): Promise<string> {
  const config = await readConfig(cwd);
  if (!config) {
    return "No avatar-gateway config found in this directory. Run `avatar_gateway_init` to get started.";
  }
  const lines = [
    `Gateway: ${config.gatewayUrl} (${config.mode})`,
    config.siteDid ? `Site DID: ${config.siteDid}` : "Site: not registered",
    config.avatarDid ? `Avatar: ${config.avatarName ?? "unnamed"} (${config.avatarDid})` : "Avatar: not registered",
    config.shuburHandle ? `Shubur handle: ${config.shuburHandle}` : "Shubur profile: not created",
    config.aiProvider ? `AI provider: ${config.aiProvider} (key from ${config.aiProviderEnvVar ?? "env"})` : "AI provider: not configured",
  ];

  // Try to ping the gateway
  try {
    const result = await gatewayFetch(config, "/health") as { status?: string };
    lines.push(`Gateway health: ${result.status ?? "unknown"}`);
  } catch {
    lines.push("Gateway health: unreachable");
  }

  return lines.join("\n");
}

// ── Tool: init ─────────────────────────────────────────────────────────────

export interface InitOptions {
  mode?: "self_hosted" | "hosted";
  gatewayUrl?: string;
  tenantApiKey?: string;
  avatarName?: string;
  aiProvider?: string;
  aiProviderEnvVar?: string;
}

export async function toolInit(opts: InitOptions, cwd: string): Promise<string> {
  const config = await readConfig(cwd) ?? {} as Partial<AvatarGatewayConfig>;
  const merged: AvatarGatewayConfig = {
    mode: opts.mode ?? config.mode ?? "self_hosted",
    gatewayUrl: opts.gatewayUrl ?? config.gatewayUrl ?? "http://localhost:4100",
    tenantApiKey: opts.tenantApiKey ?? config.tenantApiKey,
    avatarName: opts.avatarName ?? config.avatarName ?? "My Avatar",
    aiProvider: opts.aiProvider ?? config.aiProvider ?? "openai",
    aiProviderEnvVar: opts.aiProviderEnvVar ?? config.aiProviderEnvVar ?? "OPENAI_API_KEY",
    backendUrl: config.backendUrl ?? "/avatar-gateway",
    ...config,
  };
  await writeConfig(merged, cwd);
  return `Config initialised at .avatar-gateway/config.json\nGateway: ${merged.gatewayUrl} (${merged.mode})`;
}

// ── Tool: create-identity ──────────────────────────────────────────────────

export interface CreateIdentityOptions {
  siteName?: string;
  origin?: string;
  backendUrl?: string;
}

export async function toolCreateIdentity(opts: CreateIdentityOptions, cwd: string): Promise<string> {
  const identity = generateIdentity();
  await mergeConfig({
    siteDid: identity.did,
    sitePrivateKeyPem: identity.privateKeyPem,
    sitePublicKeyPem: identity.publicKeyPem,
    backendUrl: opts.backendUrl ?? "/avatar-gateway",
  }, cwd);
  return [
    "Identity created:",
    `  Site DID: ${identity.did}`,
    `  Public key: ${identity.publicKeyPem.split("\n")[1]?.slice(0, 24)}... (stored in .avatar-gateway/config.json)`,
    "  Private key: stored locally, never sent to the gateway",
  ].join("\n");
}

// ── Tool: connect-gateway ──────────────────────────────────────────────────

export interface ConnectGatewayOptions {
  origin: string;
  displayName?: string;
  contact?: string;
  offeredScopes?: string[];
}

export async function toolConnectGateway(opts: ConnectGatewayOptions, cwd: string): Promise<string> {
  const config = await readConfig(cwd);
  if (!config) return "Run avatar_gateway_init first.";
  if (!config.siteDid || !config.sitePublicKeyPem) return "Run avatar_gateway_create_identity first.";

  const body = {
    site_did: config.siteDid,
    origin: opts.origin,
    display_name: opts.displayName ?? opts.origin,
    public_key_pem: config.sitePublicKeyPem,
    backend_url: `${opts.origin}${config.backendUrl ?? "/avatar-gateway"}`,
    contact: opts.contact ?? "",
    offered_scopes: opts.offeredScopes ?? ["chat:send", "chat:receive", "page:read-public", "presence:announce"],
  };

  const result = await gatewayFetch(config, "/v1/sites", {
    method: "POST",
    body: JSON.stringify(body),
  }) as { site_did: string; status: string };

  await mergeConfig({ backendUrl: body.backend_url }, cwd);
  return `Registered with gateway.\n  Site DID: ${result.site_did}\n  Status: ${result.status}`;
}

// ── Tool: register-avatar ──────────────────────────────────────────────────

export interface RegisterAvatarOptions {
  name: string;
  publicBio?: string;
  look?: Record<string, unknown>;
}

export async function toolRegisterAvatar(opts: RegisterAvatarOptions, cwd: string): Promise<string> {
  const config = await readConfig(cwd);
  if (!config?.siteDid) return "Run avatar_gateway_connect_gateway first.";

  const avatarIdentity = generateIdentity();
  const body = {
    avatar_did: avatarIdentity.did,
    name: opts.name,
    public_key_pem: avatarIdentity.publicKeyPem,
    public_bio: opts.publicBio ?? "",
    look: opts.look ?? { style: "brick-minifig" },
  };

  const result = await gatewayFetch(config, `/v1/sites/${config.siteDid}/avatars`, {
    method: "POST",
    body: JSON.stringify(body),
  }) as { avatar_did: string; status: string };

  await mergeConfig({ avatarDid: avatarIdentity.did, avatarName: opts.name }, cwd);
  return `Avatar registered.\n  DID: ${result.avatar_did}\n  Name: ${opts.name}\n  Status: ${result.status}`;
}

// ── Tool: create-shubur-profile ────────────────────────────────────────────

export interface CreateShuburProfileOptions {
  publicBio?: string;
  followPolicy?: string;
  dmPolicy?: string;
}

export async function toolCreateShuburProfile(opts: CreateShuburProfileOptions, cwd: string): Promise<string> {
  const config = await readConfig(cwd);
  if (!config?.avatarDid) return "Run avatar_gateway_register_avatar first.";

  const body = {
    name: config.avatarName ?? "My Avatar",
    public_bio: opts.publicBio ?? "",
    follow_policy: opts.followPolicy ?? "open",
    dm_policy: opts.dmPolicy ?? "request",
  };

  await gatewayFetch(config, `/v1/agents/${config.avatarDid}/profile`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  const origin = config.backendUrl ? new URL(config.gatewayUrl).hostname : "gateway.local";
  const handle = `${(config.avatarName ?? "avatar").toLowerCase().replace(/[^a-z0-9-]/g, "-")}@${origin}`;
  await mergeConfig({ shuburHandle: handle }, cwd);
  return `Shubur profile created/updated.\n  Handle: ${handle}\n  Bio: ${body.public_bio || "(none)"}`;
}

// ── Tool: post ─────────────────────────────────────────────────────────────

export async function toolPost(text: string, cwd: string): Promise<string> {
  const config = await readConfig(cwd);
  if (!config?.avatarDid) return "Run avatar_gateway_register_avatar first.";
  if (text.length > 1000) return "Post too long (max 1000 chars)";

  const result = await gatewayFetch(config, `/v1/agents/${config.avatarDid}/posts`, {
    method: "POST",
    body: JSON.stringify({ text, nonce: crypto.randomUUID(), ts: new Date().toISOString() }),
  }) as { post_id: string };

  return `Posted. ID: ${result.post_id}`;
}

// ── Tool: follow ───────────────────────────────────────────────────────────

export async function toolFollow(followeeDid: string, cwd: string): Promise<string> {
  const config = await readConfig(cwd);
  if (!config?.avatarDid) return "Run avatar_gateway_register_avatar first.";

  const result = await gatewayFetch(config, "/v1/follows", {
    method: "POST",
    body: JSON.stringify({ follower: config.avatarDid, followee: followeeDid, nonce: crypto.randomUUID(), ts: new Date().toISOString() }),
  }) as { follow_id: string; status: string };

  return `Follow ${result.status}. ID: ${result.follow_id}`;
}

// ── Tool: dm-request ───────────────────────────────────────────────────────

export async function toolDmRequest(toDid: string, intro: string, cwd: string): Promise<string> {
  const config = await readConfig(cwd);
  if (!config?.avatarDid) return "Run avatar_gateway_register_avatar first.";

  const result = await gatewayFetch(config, "/v1/dms/requests", {
    method: "POST",
    body: JSON.stringify({ from: config.avatarDid, to: toDid, intro, nonce: crypto.randomUUID(), ts: new Date().toISOString() }),
  }) as { thread_id: string; status: string };

  return `DM request sent. Thread: ${result.thread_id}, Status: ${result.status}`;
}

// ── Tool: start-visit ──────────────────────────────────────────────────────

export async function toolStartVisit(hostSiteDid: string, purpose: string, cwd: string): Promise<string> {
  const config = await readConfig(cwd);
  if (!config?.avatarDid || !config.siteDid) return "Avatar and site must be registered first.";

  const result = await gatewayFetch(config, "/v1/visits", {
    method: "POST",
    body: JSON.stringify({
      visitor_avatar_did: config.avatarDid,
      home_site_did: config.siteDid,
      host_site_did: hostSiteDid,
      requested_scopes: ["chat:send", "chat:receive", "page:read-public"],
      purpose,
      nonce: crypto.randomUUID(),
      ts: new Date().toISOString(),
    }),
  }) as { visit_id: string; status: string; granted_scopes: string[] };

  return `Visit started.\n  ID: ${result.visit_id}\n  Status: ${result.status}\n  Scopes: ${result.granted_scopes.join(", ")}`;
}

// ── Tool: stop-visit ───────────────────────────────────────────────────────

export async function toolStopVisit(visitId: string, cwd: string): Promise<string> {
  const config = await readConfig(cwd);
  if (!config) return "No config found.";

  await gatewayFetch(config, `/v1/visits/${visitId}/end`, {
    method: "POST",
    body: JSON.stringify({ reason: "visitor_left" }),
  });
  return `Visit ${visitId} ended.`;
}

// ── Tool: install-pack ─────────────────────────────────────────────────────

export async function toolInstallPack(packIdOrPath: string, cwd: string): Promise<string> {
  // Dynamic import to avoid circular deps and keep the MCP package lean
  const { PackRegistry } = await import("@avatar-gateway/marketplace");
  const registry = new PackRegistry();
  try {
    const installed = await registry.install(packIdOrPath);
    return `Pack installed.\n  ID: ${installed.id}\n  Version: ${installed.version}\n  Path: ${installed.installPath}`;
  } catch (err) {
    return `Install failed: ${(err as Error).message}`;
  }
}

// ── Tool: customise-apartment ──────────────────────────────────────────────

export async function toolCustomiseApartment(
  updates: {
    avatarName?: string;
    outfitColor?: string;
    skinTone?: string;
    timezone?: string;
    wallColor?: string;
    furniture?: Record<string, boolean>;
  },
  cwd: string,
): Promise<string> {
  const configPath = `${cwd}/.avatar-gateway/apartment.config.json`;
  let current: Record<string, unknown> = {};
  try {
    const { readFile } = await import("node:fs/promises");
    current = JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>;
  } catch { /* first time */ }

  const merged = { ...current, ...updates };
  const { writeFile, mkdir } = await import("node:fs/promises");
  await mkdir(`${cwd}/.avatar-gateway`, { recursive: true });
  await writeFile(configPath, JSON.stringify(merged, null, 2) + "\n");

  const changes = Object.keys(updates).join(", ");
  return `Apartment config updated: ${changes}\nSaved to .avatar-gateway/apartment.config.json`;
}
