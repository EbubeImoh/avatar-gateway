import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import {
  readConfig, writeConfig, mergeConfig,
} from "./config.js";
import {
  toolStatus, toolInit, toolCreateIdentity,
  toolCustomiseApartment, toolOwnerChat, toolReadOwnerChannel, toolReadDms, toolSendDm, toolLifeStatus,
  toolPost, toolReply, toolLike, toolUnlike, toolRepost, toolUnrepost, toolTimeline, toolThread,
  toolBlock, toolUnblock, toolReport, toolSpamFlag,
} from "./tools.js";
import { MockProvider } from "@avatar-gateway/avatar-runtime";
import { generateIdentity } from "@avatar-gateway/gateway";
import { startHttpMcpServer } from "./server.js";

// ── config helpers ─────────────────────────────────────────────────────────

describe("readConfig / writeConfig", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "ag-mcp-test-")); });

  it("returns null when no config exists", async () => {
    expect(await readConfig(tmpDir)).toBeNull();
  });

  it("round-trips a config", async () => {
    await writeConfig({ gatewayUrl: "http://localhost:4100", mode: "self_hosted", avatarName: "TestBot" }, tmpDir);
    const cfg = await readConfig(tmpDir);
    expect(cfg?.avatarName).toBe("TestBot");
    expect(cfg?.mode).toBe("self_hosted");
    const fileStat = await stat(join(tmpDir, ".avatar-gateway/config.json"));
    expect(fileStat.mode & 0o777).toBe(0o600);
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("rejects non-loopback HTTP gateway URLs", async () => {
    await expect(writeConfig({ gatewayUrl: "http://gateway.example.com", mode: "self_hosted" }, tmpDir)).rejects.toThrow("HTTPS");
  });

  it("does not turn malformed config into an empty config", async () => {
    const configDir = join(tmpDir, ".avatar-gateway");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(configDir, { recursive: true }));
    await writeFile(join(configDir, "config.json"), "{");
    await expect(readConfig(tmpDir)).rejects.toThrow("malformed JSON");
  });
});

describe("mergeConfig", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "ag-merge-test-")); });

  it("merges partial updates", async () => {
    await writeConfig({ gatewayUrl: "http://localhost:4100", mode: "self_hosted", avatarName: "Bot" }, tmpDir);
    const merged = await mergeConfig({ avatarName: "NewBot" }, tmpDir);
    expect(merged.avatarName).toBe("NewBot");
    expect(merged.mode).toBe("self_hosted");
    await rm(tmpDir, { recursive: true, force: true });
  });
});

// ── toolStatus ─────────────────────────────────────────────────────────────

describe("toolStatus", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "ag-status-test-")); });

  it("returns setup prompt when no config exists", async () => {
    const out = await toolStatus(tmpDir);
    expect(out).toContain("shubur_init");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("shows gateway URL when config exists", async () => {
    await writeConfig({ gatewayUrl: "https://my-gateway:4100", mode: "self_hosted" }, tmpDir);
    const out = await toolStatus(tmpDir);
    expect(out).toContain("https://my-gateway:4100");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("reads local life status without contacting the configured gateway", async () => {
    await writeConfig({
      gatewayUrl: "http://localhost:4100",
      mode: "self_hosted",
      avatarDid: "did:key:local-agent",
      lifeStartedAt: "2026-10-27T09:00:00.000Z",
    }, tmpDir);
    const configPath = join(tmpDir, ".avatar-gateway/config.json");
    const before = await import("node:fs/promises").then(({ readFile }) => readFile(configPath, "utf8"));
    const out = await toolLifeStatus(tmpDir);
    expect(out).toContain("Current activity:");
    expect(out).toContain("Needs (0 = satisfied, 100 = urgent):");
    expect(out).not.toContain("Gateway health");
    expect(await import("node:fs/promises").then(({ readFile }) => readFile(configPath, "utf8"))).toBe(before);
  });

  it("gives a setup hint when there is no local life config", async () => {
    expect(await toolLifeStatus(tmpDir)).toContain("shubur init");
  });
});

// ── toolInit ───────────────────────────────────────────────────────────────

describe("toolInit", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "ag-init-test-")); });

  it("creates config with defaults", async () => {
    const out = await toolInit({}, tmpDir, { installPackages: false, connectGateway: false });
    expect(out).toContain("Shubur setup ready");
    const cfg = await readConfig(tmpDir);
    expect(cfg?.mode).toBe("self_hosted");
    expect(cfg?.gatewayUrl).toBe("http://localhost:4100");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("sets hosted mode when specified", async () => {
    const out = await toolInit({ mode: "hosted", gatewayUrl: "https://gateway.example.com", tenantApiKey: "ag_key", siteOrigin: "https://example.com" }, tmpDir, { installPackages: false, connectGateway: false });
    expect(out).toContain("hosted");
    const cfg = await readConfig(tmpDir);
    expect(cfg?.mode).toBe("hosted");
    expect(cfg?.tenantApiKey).toBe("ag_key");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("defaults MCP hosted setup to the deployed gateway URL", async () => {
    await toolInit({ mode: "hosted", tenantApiKey: "ag_test_key_for_hosted_default", siteOrigin: "https://example.com" }, tmpDir, { installPackages: false, connectGateway: false });
    expect((await readConfig(tmpDir))?.gatewayUrl).toBe("https://shubur-gateway.vercel.app");
  });

  it("applies updates over existing config and rejects insecure hosted URLs", async () => {
    await writeConfig({ gatewayUrl: "http://localhost:4100", mode: "self_hosted", avatarName: "Old" }, tmpDir);
    await toolInit({ mode: "hosted", gatewayUrl: "https://gateway.example.test", tenantApiKey: "test-key", siteOrigin: "https://example.test", avatarName: "New" }, tmpDir, { installPackages: false, connectGateway: false });
    expect((await readConfig(tmpDir))?.avatarName).toBe("New");
    await expect(toolInit({ mode: "hosted", gatewayUrl: "http://gateway.example.test", tenantApiKey: "test-key" }, tmpDir, { installPackages: false, connectGateway: false })).rejects.toThrow("HTTPS");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("requires a public HTTPS site origin when connecting in hosted mode", async () => {
    await expect(toolInit({ mode: "hosted", gatewayUrl: "https://gateway.example.com", tenantApiKey: "ag_key" }, tmpDir, { installPackages: false, connectGateway: false })).rejects.toThrow("DNS hostname");
    await expect(toolInit({ mode: "hosted", gatewayUrl: "https://gateway.example.com", tenantApiKey: "ag_key", siteOrigin: "http://localhost:3000" }, tmpDir, { installPackages: false, connectGateway: false })).rejects.toThrow("DNS hostname");
    await rm(tmpDir, { recursive: true, force: true });
  });
});

// ── toolCreateIdentity ─────────────────────────────────────────────────────

describe("toolCreateIdentity", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "ag-id-test-")); });

  it("generates a DID and stores keys in config", async () => {
    await writeConfig({ gatewayUrl: "http://localhost:4100", mode: "self_hosted" }, tmpDir);
    const out = await toolCreateIdentity({}, tmpDir);
    expect(out).toContain("Identity created");
    expect(out).toContain("did:key:");
    const cfg = await readConfig(tmpDir);
    expect(cfg?.siteDid).toMatch(/^did:key:/);
    expect(cfg?.sitePublicKeyPem).toContain("PUBLIC KEY");
    expect(cfg?.sitePrivateKeyPem).toContain("PRIVATE KEY");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("does not put private key in output (only in config file)", async () => {
    await writeConfig({ gatewayUrl: "http://localhost:4100", mode: "self_hosted" }, tmpDir);
    const out = await toolCreateIdentity({}, tmpDir);
    // Output should only show a prefix of the public key
    expect(out).not.toContain("PRIVATE KEY");
    await rm(tmpDir, { recursive: true, force: true });
  });
});

describe("local apartment and owner-channel tools", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "shubur-tools-")); });
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

  it("rejects invalid apartment values without writing them", async () => {
    await expect(toolCustomiseApartment({ avatar: { outfitColor: "red" } }, tmpDir)).rejects.toThrow("six-digit hex");
    await expect(toolCustomiseApartment({ timeZone: "Not/AZone" }, tmpDir)).rejects.toThrow("IANA timezone");
    await expect(toolCustomiseApartment({ furniture: { runScript: true } as never }, tmpDir)).rejects.toThrow("boolean option");
    expect(await import("node:fs/promises").then(({ readdir }) => readdir(join(tmpDir, ".avatar-gateway")).catch(() => []))).toEqual([]);
  });

  it("persists a validated apartment layout and preserves unrelated custom values", async () => {
    await toolCustomiseApartment({
      avatar: { name: "Sample Bot", outfitColor: "#123456" },
      layout: { startRoom: "studio", rooms: [{ id: "studio", name: "Studio", furniture: ["desk"] }] },
      props: [{ id: "desk-plant", room: "studio", kind: "plant", label: "A plant", x: 35, y: 45 }],
    }, tmpDir);
    await toolCustomiseApartment({ lighting: { nightDimOpacity: 0.2 } }, tmpDir);
    const saved = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(join(tmpDir, ".avatar-gateway/apartment.config.json"), "utf8"))) as {
      avatar: { name: string; outfitColor: string };
      layout: { rooms: Array<{ id: string }> };
      props: Array<{ id: string }>;
      lighting: { nightDimOpacity: number };
    };
    expect(saved.avatar).toMatchObject({ name: "Sample Bot", outfitColor: "#123456" });
    expect(saved.layout.rooms.map(({ id }) => id)).toEqual(["studio"]);
    expect(saved.props[0]?.id).toBe("desk-plant");
    expect(saved.lighting.nightDimOpacity).toBe(0.2);
    const configStat = await stat(join(tmpDir, ".avatar-gateway/apartment.config.json"));
    expect(configStat.mode & 0o777).toBe(0o600);
  });

  it("drives life status from the customised apartment's name and layout", async () => {
    await writeConfig({ gatewayUrl: "http://localhost:4100", mode: "self_hosted", avatarDid: "did:key:loft-agent", lifeStartedAt: "2026-10-27T09:00:00.000Z" }, tmpDir);
    await toolCustomiseApartment({
      name: "Garden Flat",
      layout: { startRoom: "living", rooms: [{ id: "living", name: "Living room", furniture: ["sofa", "bookshelf"] }] },
    }, tmpDir);
    const out = await toolLifeStatus(tmpDir);
    expect(out).toContain("Place: Garden Flat · living");
  });

  it("leaves malformed saved apartment configuration untouched", async () => {
    const configPath = join(tmpDir, ".avatar-gateway/apartment.config.json");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(tmpDir, ".avatar-gateway"), { recursive: true }));
    await writeFile(configPath, "{");
    await expect(toolCustomiseApartment({ avatar: { name: "New" } }, tmpDir)).rejects.toThrow("invalid; it was left untouched");
    expect(await import("node:fs/promises").then(({ readFile }) => readFile(configPath, "utf8"))).toBe("{");
  });

  it("keeps owner-channel messages local with restrictive permissions", async () => {
    await toolInit({ avatarName: "Private Bot" }, tmpDir, { installPackages: false, connectGateway: false });
    const reply = await toolOwnerChat("Help me review a private note", tmpDir, new MockProvider());
    expect(reply).toContain("mock reply");
    const transcript = JSON.parse(await toolReadOwnerChannel(tmpDir)) as Array<{ role: string; text: string }>;
    expect(transcript.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(transcript[0].text).toBe("Help me review a private note");
    const transcriptStat = await stat(join(tmpDir, ".avatar-gateway/owner-channel.json"));
    expect(transcriptStat.mode & 0o777).toBe(0o600);
    expect(await toolReadOwnerChannel(tmpDir, 1)).toContain("mock reply");
  });

  it("uses MockProvider from an init-selected mock configuration", async () => {
    await toolInit({ avatarName: "Mock Bot", aiProvider: "mock" }, tmpDir, { installPackages: false, connectGateway: false });
    expect(await toolOwnerChat("Hello without credentials", tmpDir)).toContain("mock reply");
    expect(await toolStatus(tmpDir)).toContain("mock (no API key required)");
  });

  it("does not call an owner provider before local config exists", async () => {
    const provider = new MockProvider();
    const complete = vi.spyOn(provider, "complete");
    expect(await toolOwnerChat("Hello", tmpDir, provider)).toContain("Run shubur_init");
    expect(complete).not.toHaveBeenCalled();
  });
});

describe("Shubur MCP Streamable HTTP transport", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "shubur-mcp-http-")); });
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

  it("exposes setup and operation tools with an MCP session", async () => {
    const { server, address } = await startHttpMcpServer({ cwd: tmpDir, port: 0 });
    try {
      const init = await fetch(address, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "initialize",
          params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } },
        }),
      });
      expect(init.status).toBe(200);
      const sessionId = init.headers.get("mcp-session-id");
      expect(sessionId).toBeTruthy();

      const listed = await fetch(address, {
        method: "POST",
        headers: {
          "content-type": "application/json", accept: "application/json, text/event-stream",
          "mcp-session-id": sessionId!,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
      });
      expect(listed.status).toBe(200);
      const result = await listed.json() as { result: { tools: Array<{ name: string; inputSchema?: unknown }> } };
      const names = result.result.tools.map((tool) => tool.name);
      expect(names).toContain("shubur_init");
      const initTool = result.result.tools.find((tool) => tool.name === "shubur_init");
      expect(JSON.stringify(initTool?.inputSchema)).toContain('"mock"');
      expect(names).toContain("shubur_life_status");
      expect(names).toContain("shubur_read_dms");
      expect(names).toContain("shubur_read_owner_channel");
      expect(names).toEqual(expect.arrayContaining([
        "shubur_reply", "shubur_like", "shubur_unlike", "shubur_repost", "shubur_unrepost",
        "shubur_timeline", "shubur_thread", "shubur_block", "shubur_unblock", "shubur_report", "shubur_spam_flag",
      ]));

      await fetch(address, {
        method: "DELETE",
        headers: { accept: "application/json, text/event-stream", "mcp-session-id": sessionId! },
      });
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });

  it("requires authentication and host allowlisting before binding off-loopback", async () => {
    await expect(startHttpMcpServer({ host: "192.0.2.1", port: 0 })).rejects.toThrow("SHUBUR_MCP_TOKEN");
  });
});

describe("DM MCP helpers", () => {
  let tmpDir: string;
  let avatarIdentity: ReturnType<typeof generateIdentity>;
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "shubur-dm-"));
    const siteIdentity = generateIdentity();
    avatarIdentity = generateIdentity();
    await writeConfig({
      gatewayUrl: "http://localhost:4100", mode: "self_hosted", avatarDid: avatarIdentity.did,
      avatarPrivateKeyPem: avatarIdentity.privateKeyPem, avatarPublicKeyPem: avatarIdentity.publicKeyPem, tenantApiKey: "not-returned",
      siteDid: siteIdentity.did, sitePrivateKeyPem: siteIdentity.privateKeyPem, sitePublicKeyPem: siteIdentity.publicKeyPem,
    }, tmpDir);
  });
  afterEach(async () => { vi.unstubAllGlobals(); await rm(tmpDir, { recursive: true, force: true }); });

  it("lists the configured avatar's DMs and reads a single thread", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith(`/v1/dms?agent_did=${encodeURIComponent(avatarIdentity.did)}`)) {
        return Response.json({ threads: [{ threadId: "dmt_1", status: "accepted" }] });
      }
      return Response.json({ thread_id: "dmt_1", status: "accepted", intro: "", messages: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await toolReadDms(undefined, tmpDir)).toContain("dmt_1");
    expect(await toolReadDms("dmt_1", tmpDir)).toContain("Untrusted agent-authored network data");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get("x-ag-agent-did")).toBe(avatarIdentity.did);
      expect(headers.get("x-ag-sig")).toBeTruthy();
      expect(headers.get("x-ag-site-did")).toBeNull();
    }
  });

  it("sends an accepted-thread message without returning tenant credentials", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "POST") return Response.json({ message_id: "dmm_1" }, { status: 202 });
      return Response.json({ messages: [{ seq: 2 }] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await toolSendDm("dmt_1", "Hello", tmpDir);
    expect(result).toContain("dmm_1");
    expect(result).not.toContain("not-returned");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const headers = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(headers.get("x-ag-agent-did")).toBe(avatarIdentity.did);
  });

  it("routes the new social tools through the configured agent identity", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => Response.json({ post_id: "pst_mock", status: "recorded" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await toolPost("Hello", tmpDir)).toContain("pst_mock");
    expect(await toolReply("pst_parent", "Reply", tmpDir)).toContain("pst_mock");
    await toolLike("pst_parent", tmpDir);
    await toolUnlike("pst_parent", tmpDir);
    await toolRepost("pst_parent", tmpDir);
    await toolUnrepost("pst_parent", tmpDir);
    expect(await toolTimeline("home", undefined, tmpDir)).toContain("Untrusted agent-authored network data");
    expect(await toolThread("pst_parent", tmpDir)).toContain("Untrusted agent-authored network data");
    await toolBlock("did:key:blocked", tmpDir);
    await toolUnblock("did:key:blocked", tmpDir);
    await toolReport("did:key:subject", "Agent report", "agent", undefined, tmpDir);
    await toolSpamFlag("agent", "did:key:subject", tmpDir);
    expect(fetchMock).toHaveBeenCalledTimes(12);
    for (const [, init] of fetchMock.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get("x-ag-agent-did")).toBe(avatarIdentity.did);
      expect(headers.get("x-ag-sig")).toBeTruthy();
    }
  });
});
