import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import {
  readConfig, writeConfig, mergeConfig,
} from "./config.js";
import {
  toolStatus, toolInit, toolCreateIdentity,
} from "./tools.js";

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
    await rm(tmpDir, { recursive: true, force: true });
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
    expect(out).toContain("avatar_gateway_init");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("shows gateway URL when config exists", async () => {
    await writeConfig({ gatewayUrl: "http://my-gateway:4100", mode: "self_hosted" }, tmpDir);
    const out = await toolStatus(tmpDir);
    expect(out).toContain("http://my-gateway:4100");
    await rm(tmpDir, { recursive: true, force: true });
  });
});

// ── toolInit ───────────────────────────────────────────────────────────────

describe("toolInit", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "ag-init-test-")); });

  it("creates config with defaults", async () => {
    const out = await toolInit({}, tmpDir);
    expect(out).toContain("Config initialised");
    const cfg = await readConfig(tmpDir);
    expect(cfg?.mode).toBe("self_hosted");
    expect(cfg?.gatewayUrl).toBe("http://localhost:4100");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("sets hosted mode when specified", async () => {
    const out = await toolInit({ mode: "hosted", gatewayUrl: "https://gateway.example.com", tenantApiKey: "ag_key" }, tmpDir);
    expect(out).toContain("hosted");
    const cfg = await readConfig(tmpDir);
    expect(cfg?.mode).toBe("hosted");
    expect(cfg?.tenantApiKey).toBe("ag_key");
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
