/**
 * Pack registry client: fetch the registry index, find packs, download and
 * install them from a URL or local path, and verify SHA-256 integrity.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  PackManifest,
  RegistryIndex,
  RegistryEntry,
  InstalledPack,
  EntitlementAdapter,
} from "./types.js";
import { OpenEntitlementAdapter } from "./types.js";

export const DEFAULT_REGISTRY_URL = "https://registry.avatar-gateway.dev";
export const DEFAULT_INSTALL_DIR = ".avatar-gateway/packs";
export const INSTALLED_INDEX_FILE = ".avatar-gateway/packs/installed.json";

// ── Integrity helpers ──────────────────────────────────────────────────────

export function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function verifyPackIntegrity(
  archiveBytes: Uint8Array,
  expectedSha256: string,
): boolean {
  return sha256Hex(archiveBytes) === expectedSha256.toLowerCase();
}

/** Verify a pack manifest against its declared asset checksums (no crypto sig check needed locally). */
export function verifyManifestAssets(
  manifest: PackManifest,
  assetContents: Map<string, Uint8Array>,
): { valid: boolean; failed: string[] } {
  const failed: string[] = [];
  for (const asset of manifest.assets) {
    const content = assetContents.get(asset.path);
    if (!content) { failed.push(`${asset.path}: missing`); continue; }
    const actual = sha256Hex(content);
    if (actual !== asset.sha256.toLowerCase()) {
      failed.push(`${asset.path}: expected ${asset.sha256} got ${actual}`);
    }
  }
  return { valid: failed.length === 0, failed };
}

// ── Registry client ────────────────────────────────────────────────────────

export class PackRegistry {
  constructor(
    private readonly registryUrl = DEFAULT_REGISTRY_URL,
    private readonly installDir = DEFAULT_INSTALL_DIR,
    private readonly entitlement: EntitlementAdapter = new OpenEntitlementAdapter(),
  ) {}

  /** Fetch the registry index. */
  async fetchIndex(): Promise<RegistryIndex> {
    const url = `${this.registryUrl}/index.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Registry fetch failed: ${res.status}`);
    return res.json() as Promise<RegistryIndex>;
  }

  /** Search the registry for packs matching a query string. */
  async search(query: string): Promise<RegistryEntry[]> {
    const index = await this.fetchIndex();
    const q = query.toLowerCase();
    return index.packs.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }

  /**
   * Install a pack by id from the registry (or a direct URL / local path).
   * For paid packs, checks entitlement before downloading.
   */
  async install(
    packIdOrUrl: string,
    opts: { userId?: string; force?: boolean } = {},
  ): Promise<InstalledPack> {
    // If it looks like a local path or absolute URL, handle directly
    if (packIdOrUrl.startsWith("file://") || packIdOrUrl.startsWith("/") || packIdOrUrl.startsWith("./")) {
      return this.installFromLocalPath(packIdOrUrl.replace(/^file:\/\//, ""));
    }
    if (packIdOrUrl.startsWith("https://") || packIdOrUrl.startsWith("http://")) {
      return this.installFromUrl(packIdOrUrl, { userId: opts.userId });
    }

    // Resolve from registry
    const index = await this.fetchIndex();
    const entry = index.packs.find((p) => p.id === packIdOrUrl);
    if (!entry) throw new Error(`Pack not found in registry: ${packIdOrUrl}`);

    if (entry.priceTier === "paid") {
      const entitled = await this.entitlement.checkEntitlement(entry.id, opts.userId ?? "anonymous");
      if (!entitled) throw new Error(`Not entitled to pack "${entry.id}" — purchase required`);
    }

    return this.installFromUrl(entry.downloadUrl, { expectedSha256: entry.archiveSha256, userId: opts.userId });
  }

  /** Install from a direct URL (downloads, verifies integrity, unpacks manifest). */
  async installFromUrl(
    url: string,
    opts: { expectedSha256?: string; userId?: string } = {},
  ): Promise<InstalledPack> {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Pack download failed: ${res.status} ${url}`);
    const archiveBytes = new Uint8Array(await res.arrayBuffer());

    if (opts.expectedSha256 && !verifyPackIntegrity(archiveBytes, opts.expectedSha256)) {
      throw new Error("Pack integrity check failed: SHA-256 mismatch");
    }

    return this.unpackAndRecord(archiveBytes, url);
  }

  /** Install from a local file path. */
  async installFromLocalPath(localPath: string): Promise<InstalledPack> {
    const absPath = resolve(localPath);
    const archiveBytes = await readFile(absPath);
    return this.unpackAndRecord(new Uint8Array(archiveBytes), `file://${absPath}`);
  }

  /**
   * Unpack a pack archive (expected format: JSON manifest for now; binary zip
   * support is a future extension) and record the installation.
   */
  private async unpackAndRecord(archiveBytes: Uint8Array, sourceUrl: string): Promise<InstalledPack> {
    // For the current implementation, packs are JSON manifest files.
    // Binary zip support is marked as a future extension.
    let manifest: PackManifest;
    try {
      manifest = JSON.parse(new TextDecoder().decode(archiveBytes)) as PackManifest;
    } catch {
      throw new Error("Invalid pack format: expected JSON manifest");
    }

    if (!manifest.id || !manifest.version || !manifest.name) {
      throw new Error("Invalid pack manifest: missing id, version or name");
    }

    const packDir = join(this.installDir, manifest.id.replace(/\//g, "__"));
    await mkdir(packDir, { recursive: true });
    await writeFile(join(packDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    const installed: InstalledPack = {
      id: manifest.id,
      version: manifest.version,
      name: manifest.name,
      installedAt: new Date().toISOString(),
      installPath: packDir,
      priceTier: manifest.priceTier,
    };

    await this.updateInstalledIndex(installed);
    return installed;
  }

  async listInstalled(): Promise<InstalledPack[]> {
    try {
      const raw = await readFile(join(this.installDir, "installed.json"), "utf8");
      return JSON.parse(raw) as InstalledPack[];
    } catch {
      return [];
    }
  }

  private async updateInstalledIndex(pack: InstalledPack): Promise<void> {
    await mkdir(this.installDir, { recursive: true });
    const existing = await this.listInstalled();
    const filtered = existing.filter((p) => p.id !== pack.id);
    filtered.push(pack);
    await writeFile(join(this.installDir, "installed.json"), JSON.stringify(filtered, null, 2));
  }
}

// ── Built-in starter pack manifest ────────────────────────────────────────

/** The first built-in free pack: the Starter Apartment. */
export const STARTER_APARTMENT_PACK: PackManifest = {
  id: "com.avatar-gateway.starter-apartment",
  version: "0.2.0",
  name: "Starter Apartment",
  description: "The \"lives its day\" apartment scene from Ebube's portfolio. Brick-style avatar at a desk, configurable day-cycle, room, furniture, and look.",
  author: { name: "Ebube Imoh", url: "https://www.ebubeimoh.com/" },
  licence: "Apache-2.0",
  priceTier: "free",
  categories: ["apartment"],
  compatibility: ">=0.2.0",
  keywords: ["apartment", "desk", "lagos", "day-cycle", "brick"],
  assets: [
    {
      path: "src/index.ts",
      sha256: "0000000000000000000000000000000000000000000000000000000000000000",
      licence: "Apache-2.0",
    },
  ],
};
