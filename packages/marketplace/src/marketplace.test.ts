import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import {
  sha256Hex,
  verifyPackIntegrity,
  verifyManifestAssets,
  PackRegistry,
  STARTER_APARTMENT_PACK,
  signPackManifest,
  verifyPackManifestSignature,
  validatePackManifest,
} from "./registry.js";
import type { PackManifest } from "./types.js";
import { OpenEntitlementAdapter } from "./types.js";

// ── sha256Hex / verifyPackIntegrity ────────────────────────────────────────

describe("sha256Hex", () => {
  it("returns 64-char hex string", () => {
    expect(sha256Hex("hello")).toHaveLength(64);
    expect(sha256Hex("hello")).toMatch(/^[0-9a-f]+$/);
  });
  it("is deterministic", () => {
    expect(sha256Hex("test")).toBe(sha256Hex("test"));
  });
});

describe("verifyPackIntegrity", () => {
  it("returns true when hash matches", () => {
    const data = new TextEncoder().encode("pack content");
    const hash = sha256Hex(data);
    expect(verifyPackIntegrity(data, hash)).toBe(true);
  });
  it("returns false when hash mismatches", () => {
    const data = new TextEncoder().encode("pack content");
    expect(verifyPackIntegrity(data, "0".repeat(64))).toBe(false);
  });

  it("rejects malformed hashes", () => {
    expect(verifyPackIntegrity(new TextEncoder().encode("pack"), "sha256:123")).toBe(false);
  });
});

describe("pack manifest signatures", () => {
  it("verifies a canonical Ed25519 signature and rejects tampered fields", () => {
    const pair = generateKeyPairSync("ed25519");
    const signerPublicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
    const manifest = signPackManifest({ ...STARTER_APARTMENT_PACK, signerPublicKeyPem }, pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    expect(verifyPackManifestSignature(manifest)).toBe(true);
    expect(verifyPackManifestSignature({ ...manifest, description: "Changed after signing" })).toBe(false);
  });

  it("rejects traversal paths, invalid digests, and incomplete signature metadata", () => {
    expect(() => validatePackManifest({ ...STARTER_APARTMENT_PACK, id: "../../outside" })).toThrow("id must use lowercase");
    expect(() => validatePackManifest({
      ...STARTER_APARTMENT_PACK,
      assets: [{ path: "../../secret", sha256: "0".repeat(64), licence: "MIT" }],
    })).toThrow("path is unsafe");
    expect(() => validatePackManifest({ ...STARTER_APARTMENT_PACK, signerPublicKeyPem: "public" })).toThrow("must be provided together");
  });
});

// ── verifyManifestAssets ───────────────────────────────────────────────────

describe("verifyManifestAssets", () => {
  const content = new TextEncoder().encode("asset body");
  const manifest: PackManifest = {
    id: "test.pack", version: "1.0.0", name: "Test", description: "d",
    author: { name: "Author" }, licence: "MIT", priceTier: "free",
    categories: ["prop"], compatibility: ">=0.2.0",
    assets: [{ path: "a.js", sha256: sha256Hex(content), licence: "MIT" }],
  };

  it("passes when all assets match", () => {
    const { valid, failed } = verifyManifestAssets(manifest, new Map([["a.js", content]]));
    expect(valid).toBe(true);
    expect(failed).toHaveLength(0);
  });

  it("fails when asset is missing", () => {
    const { valid, failed } = verifyManifestAssets(manifest, new Map());
    expect(valid).toBe(false);
    expect(failed[0]).toContain("missing");
  });

  it("fails when checksum mismatches", () => {
    const wrong = new TextEncoder().encode("different");
    const { valid, failed } = verifyManifestAssets(manifest, new Map([["a.js", wrong]]));
    expect(valid).toBe(false);
    expect(failed[0]).toContain("expected");
  });
});

// ── OpenEntitlementAdapter ─────────────────────────────────────────────────

describe("OpenEntitlementAdapter", () => {
  it("always returns true", async () => {
    const adapter = new OpenEntitlementAdapter();
    expect(await adapter.checkEntitlement("any.pack", "user123")).toBe(true);
  });
});

// ── PackRegistry — local install ───────────────────────────────────────────

describe("PackRegistry.installFromLocalPath", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "ag-pack-test-"));
  });

  // cleanup after each
  // (vitest doesn't have afterEach as a sibling import in this version; use manual cleanup)

  it("installs a valid JSON manifest from a local path", async () => {
    const manifest: PackManifest = {
      id: "com.test.my-pack", version: "1.0.0", name: "My Pack", description: "test",
      author: { name: "Tester" }, licence: "MIT", priceTier: "free",
      categories: ["theme"], compatibility: ">=0.2.0", assets: [],
    };

    const packFile = join(tmpDir, "my-pack.json");
    await writeFile(packFile, JSON.stringify(manifest));

    const installDir = join(tmpDir, "packs");
    const registry = new PackRegistry("https://example.com", installDir);
    const installed = await registry.installFromLocalPath(packFile);

    expect(installed.id).toBe("com.test.my-pack");
    expect(installed.version).toBe("1.0.0");
    expect(installed.priceTier).toBe("free");
    expect(installed.installPath).toContain("com__test__my-pack");

    await rm(tmpDir, { recursive: true, force: true });
  });

  it("rejects invalid JSON", async () => {
    const badFile = join(tmpDir, "bad.json");
    await writeFile(badFile, "not json at all");

    const registry = new PackRegistry("https://example.com", join(tmpDir, "packs"));
    await expect(registry.installFromLocalPath(badFile)).rejects.toThrow("Invalid pack format");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("rejects manifest missing required fields", async () => {
    const badFile = join(tmpDir, "incomplete.json");
    await writeFile(badFile, JSON.stringify({ id: "x" }));

    const registry = new PackRegistry("https://example.com", join(tmpDir, "packs"));
    await expect(registry.installFromLocalPath(badFile)).rejects.toThrow("Invalid pack manifest");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("rejects an invalid manifest signature before writing into the pack directory", async () => {
    const pair = generateKeyPairSync("ed25519");
    const signerPublicKeyPem = pair.publicKey.export({ type: "spki", format: "pem" }).toString();
    const signed = signPackManifest({ ...STARTER_APARTMENT_PACK, signerPublicKeyPem }, pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    const packFile = join(tmpDir, "tampered.json");
    await writeFile(packFile, JSON.stringify({ ...signed, name: "Tampered" }));
    const registry = new PackRegistry("https://example.com", join(tmpDir, "packs"));
    await expect(registry.installFromLocalPath(packFile)).rejects.toThrow("signature verification failed");
    await expect(registry.listInstalled()).resolves.toEqual([]);
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("requires signatures and an archive digest for remote packs", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(STARTER_APARTMENT_PACK));
    const fetchMock = vi.fn(async () => new Response(bytes, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const registry = new PackRegistry("https://example.com", join(tmpdir(), `shubur-remote-${Date.now()}`));
      await expect(registry.installFromUrl("https://example.com/pack.json", { expectedSha256: "0".repeat(64) })).rejects.toThrow("SHA-256 mismatch");
      await expect(registry.installFromUrl("https://example.com/pack.json", { expectedSha256: sha256Hex(bytes) })).rejects.toThrow("must include a valid Ed25519 signature");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("denies paid packs when no entitlement adapter is configured", async () => {
    const paidManifest = { ...STARTER_APARTMENT_PACK, id: "com.example.paid", priceTier: "paid" as const };
    const file = join(tmpDir, "paid.json");
    await writeFile(file, JSON.stringify(paidManifest));
    const registry = new PackRegistry("https://example.com", join(tmpDir, "packs"));
    await expect(registry.installFromLocalPath(file)).rejects.toThrow("Not entitled");
  });
});

// ── PackRegistry.listInstalled ─────────────────────────────────────────────

describe("PackRegistry.listInstalled", () => {
  it("returns empty array when nothing installed", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "ag-list-"));
    const registry = new PackRegistry("https://example.com", join(tmpDir, "packs"));
    expect(await registry.listInstalled()).toEqual([]);
    await rm(tmpDir, { recursive: true, force: true });
  });
});

// ── STARTER_APARTMENT_PACK ─────────────────────────────────────────────────

describe("STARTER_APARTMENT_PACK", () => {
  it("has id com.avatar-gateway.starter-apartment", () => {
    expect(STARTER_APARTMENT_PACK.id).toBe("com.avatar-gateway.starter-apartment");
  });
  it("is free", () => {
    expect(STARTER_APARTMENT_PACK.priceTier).toBe("free");
  });
  it("is Apache-2.0", () => {
    expect(STARTER_APARTMENT_PACK.licence).toBe("Apache-2.0");
  });
  it("has apartment category", () => {
    expect(STARTER_APARTMENT_PACK.categories).toContain("apartment");
  });
});
