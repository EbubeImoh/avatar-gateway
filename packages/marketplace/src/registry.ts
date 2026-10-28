/** Validate, verify, and install Shubur Marketplace JSON pack manifests. */

import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { chmod, lstat, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  PackManifest,
  RegistryIndex,
  RegistryEntry,
  InstalledPack,
  EntitlementAdapter,
} from "./types.js";
import { DenyPaidEntitlementAdapter } from "./types.js";

export const DEFAULT_REGISTRY_URL = "https://registry.shubur.dev";
export const DEFAULT_INSTALL_DIR = ".avatar-gateway/packs";
export const INSTALLED_INDEX_FILE = ".avatar-gateway/packs/installed.json";
const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024;
const PACK_ID_RE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA256_RE = /^[a-f0-9]{64}$/i;
const CATEGORIES = new Set(["apartment", "skin", "prop", "theme", "behaviour", "bundle"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeAssetPath(value: string): boolean {
  return value.length > 0 && value.length <= 240 && !value.startsWith("/") && !value.includes("\\")
    && !value.includes(":") && value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function validatePackId(id: unknown): asserts id is string {
  if (typeof id !== "string" || id.length > 180 || !PACK_ID_RE.test(id)) {
    throw new Error("Invalid pack manifest: id must use lowercase reverse-domain letters, digits, dots, or hyphens.");
  }
}

function validateVersion(version: unknown, label = "version"): asserts version is string {
  if (typeof version !== "string" || !VERSION_RE.test(version)) throw new Error(`Invalid pack manifest: ${label} must be a semantic version.`);
}

function validateRemoteUrl(value: string, label: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error(`${label} must be an absolute HTTPS URL.`); }
  if (url.protocol !== "https:" || url.username || url.password || url.hash) {
    throw new Error(`${label} must use HTTPS and cannot contain credentials or a fragment.`);
  }
  return url;
}

/** Parse untrusted JSON and validate every field consumed by the installer. */
export function validatePackManifest(input: unknown): PackManifest {
  if (!isRecord(input)) throw new Error("Invalid pack manifest: expected a JSON object.");
  validatePackId(input.id);
  validateVersion(input.version);
  for (const [key, limit] of [["name", 120], ["description", 1000], ["licence", 120], ["compatibility", 120]] as const) {
    if (typeof input[key] !== "string" || !input[key].trim() || input[key].length > limit) {
      throw new Error(`Invalid pack manifest: ${key} must contain 1–${limit} characters.`);
    }
  }
  if (input.priceTier !== "free" && input.priceTier !== "paid") throw new Error("Invalid pack manifest: priceTier must be free or paid.");
  if (!Array.isArray(input.categories) || input.categories.length < 1 || input.categories.length > 6 || input.categories.some((item) => typeof item !== "string" || !CATEGORIES.has(item))) {
    throw new Error("Invalid pack manifest: categories contains an unsupported value.");
  }
  if (!isRecord(input.author) || typeof input.author.name !== "string" || !input.author.name.trim() || input.author.name.length > 120) {
    throw new Error("Invalid pack manifest: author.name is required.");
  }
  if (input.author.url !== undefined) validateRemoteUrl(String(input.author.url), "author.url");
  if (input.author.email !== undefined && (typeof input.author.email !== "string" || input.author.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.author.email))) {
    throw new Error("Invalid pack manifest: author.email is invalid.");
  }
  if (typeof input.assets !== "object" || !Array.isArray(input.assets) || input.assets.length > 1000) {
    throw new Error("Invalid pack manifest: assets must be an array with at most 1000 entries.");
  }
  const assetPaths = new Set<string>();
  for (const [index, asset] of input.assets.entries()) {
    if (!isRecord(asset) || typeof asset.path !== "string" || !isSafeAssetPath(asset.path)) {
      throw new Error(`Invalid pack manifest: assets[${index}].path is unsafe.`);
    }
    if (assetPaths.has(asset.path)) throw new Error(`Invalid pack manifest: duplicate asset path ${asset.path}.`);
    assetPaths.add(asset.path);
    if (typeof asset.sha256 !== "string" || !SHA256_RE.test(asset.sha256)) throw new Error(`Invalid pack manifest: assets[${index}].sha256 must be a SHA-256 hex digest.`);
    if (typeof asset.licence !== "string" || !asset.licence.trim() || asset.licence.length > 120) throw new Error(`Invalid pack manifest: assets[${index}].licence is required.`);
    if (asset.credit !== undefined && (typeof asset.credit !== "string" || asset.credit.length > 500)) throw new Error(`Invalid pack manifest: assets[${index}].credit is too long.`);
  }
  if (input.preview !== undefined && (typeof input.preview !== "string" || !isSafeAssetPath(input.preview) || !assetPaths.has(input.preview))) {
    throw new Error("Invalid pack manifest: preview must refer to a declared asset path.");
  }
  if (input.keywords !== undefined && (!Array.isArray(input.keywords) || input.keywords.length > 50 || input.keywords.some((item) => typeof item !== "string" || item.length > 50))) {
    throw new Error("Invalid pack manifest: keywords must be short strings.");
  }
  if (input.signature !== undefined && typeof input.signature !== "string") throw new Error("Invalid pack manifest: signature must be base64 text.");
  if (input.signerPublicKeyPem !== undefined && typeof input.signerPublicKeyPem !== "string") throw new Error("Invalid pack manifest: signerPublicKeyPem must be PEM text.");
  if ((input.signature === undefined) !== (input.signerPublicKeyPem === undefined)) {
    throw new Error("Invalid pack manifest: signature and signerPublicKeyPem must be provided together.");
  }
  return input as unknown as PackManifest;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function canonicalManifest(manifest: PackManifest): string {
  const payload = { ...manifest };
  delete payload.signature;
  return stableJson(payload);
}

/** Sign the stable JSON form of a manifest with an Ed25519 private key. */
export function signPackManifest(manifest: Omit<PackManifest, "signature" | "signerPublicKeyPem"> & { signerPublicKeyPem: string }, privateKeyPem: string): PackManifest {
  const base = validatePackManifest({ ...manifest, signature: "" });
  const signature = sign(null, Buffer.from(canonicalManifest(base)), createPrivateKey(privateKeyPem)).toString("base64");
  return { ...base, signature };
}

/** Verify a manifest signature against the public key embedded in its signed data. */
export function verifyPackManifestSignature(manifest: PackManifest): boolean {
  if (!manifest.signature || !manifest.signerPublicKeyPem) return false;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(manifest.signature)) return false;
  try {
    return verify(null, Buffer.from(canonicalManifest(manifest)), createPublicKey(manifest.signerPublicKeyPem), Buffer.from(manifest.signature, "base64"));
  } catch {
    return false;
  }
}

// ── Integrity helpers ────────────────────────────────────────────────────

export function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function verifyPackIntegrity(archiveBytes: Uint8Array, expectedSha256: string): boolean {
  return SHA256_RE.test(expectedSha256) && sha256Hex(archiveBytes) === expectedSha256.toLowerCase();
}

/** Verify declared asset digests against the actual contents supplied by a pack archive. */
export function verifyManifestAssets(manifest: PackManifest, assetContents: Map<string, Uint8Array>): { valid: boolean; failed: string[] } {
  const failed: string[] = [];
  for (const asset of manifest.assets) {
    const content = assetContents.get(asset.path);
    if (!content) { failed.push(`${asset.path}: missing`); continue; }
    const actual = sha256Hex(content);
    if (actual !== asset.sha256.toLowerCase()) failed.push(`${asset.path}: expected ${asset.sha256} got ${actual}`);
  }
  return { valid: failed.length === 0, failed };
}

async function downloadBytes(url: string, label: string): Promise<Uint8Array> {
  validateRemoteUrl(url, label);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: "error" });
  if (!response.ok) throw new Error(`${label} failed: ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_DOWNLOAD_BYTES) throw new Error(`${label} exceeds the ${MAX_DOWNLOAD_BYTES}-byte manifest limit.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_DOWNLOAD_BYTES) throw new Error(`${label} exceeds the ${MAX_DOWNLOAD_BYTES}-byte manifest limit.`);
  return bytes;
}

function parseIndex(input: unknown, registryOrigin: string): RegistryIndex {
  if (!isRecord(input) || input.version !== "1" || typeof input.updatedAt !== "string" || !Array.isArray(input.packs) || input.packs.length > 10_000) {
    throw new Error("Invalid Shubur Marketplace registry index.");
  }
  const packs: RegistryEntry[] = input.packs.map((item, index) => {
    if (!isRecord(item)) throw new Error(`Invalid registry entry at index ${index}.`);
    validatePackId(item.id);
    validateVersion(item.version, `packs[${index}].version`);
    if (typeof item.name !== "string" || !item.name.trim() || typeof item.description !== "string" || !item.description.trim()) throw new Error(`Invalid registry entry at index ${index}.`);
    if (item.priceTier !== "free" && item.priceTier !== "paid") throw new Error(`Invalid registry entry at index ${index}: bad price tier.`);
    if (!Array.isArray(item.categories) || item.categories.some((category) => typeof category !== "string" || !CATEGORIES.has(category))) throw new Error(`Invalid registry entry at index ${index}: bad categories.`);
    if (typeof item.author !== "string" || !item.author.trim()) throw new Error(`Invalid registry entry at index ${index}: author is missing.`);
    const downloadUrl = validateRemoteUrl(String(item.downloadUrl), "Pack download URL");
    if (downloadUrl.origin !== registryOrigin) throw new Error("Registry pack downloads must use the configured registry origin.");
    if (typeof item.archiveSha256 !== "string" || !SHA256_RE.test(item.archiveSha256)) throw new Error(`Invalid registry entry at index ${index}: archiveSha256 is required.`);
    return item as unknown as RegistryEntry;
  });
  return { version: "1", updatedAt: input.updatedAt, packs };
}

// ── Registry client ───────────────────────────────────────────────────────

export class PackRegistry {
  private readonly registryUrl: string;
  private readonly installDir: string;

  constructor(registryUrl = process.env.SHUBUR_REGISTRY_URL ?? DEFAULT_REGISTRY_URL, installDir = DEFAULT_INSTALL_DIR, private readonly entitlement: EntitlementAdapter = new DenyPaidEntitlementAdapter()) {
    const parsed = validateRemoteUrl(registryUrl, "Registry URL");
    this.registryUrl = parsed.toString().replace(/\/$/, "");
    this.installDir = resolve(installDir);
  }

  async fetchIndex(): Promise<RegistryIndex> {
    let bytes: Uint8Array;
    try {
      bytes = await downloadBytes(`${this.registryUrl}/index.json`, "Registry fetch");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Shubur Marketplace registry is unreachable or not configured at ${this.registryUrl} (${reason}). ` +
        `Configure SHUBUR_REGISTRY_URL or retry with --registry <https-url> after a registry is published.`,
      );
    }
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
    catch { throw new Error("Registry returned invalid JSON."); }
    return parseIndex(parsed, new URL(this.registryUrl).origin);
  }

  async search(query: string): Promise<RegistryEntry[]> {
    const index = await this.fetchIndex();
    const lower = query.toLowerCase();
    return index.packs.filter((pack) => pack.id.toLowerCase().includes(lower) || pack.name.toLowerCase().includes(lower) || pack.description.toLowerCase().includes(lower));
  }

  async install(packIdOrUrl: string, opts: { userId?: string; force?: boolean } = {}): Promise<InstalledPack> {
    if (packIdOrUrl.startsWith("file://") || packIdOrUrl.startsWith("/") || packIdOrUrl.startsWith("./") || packIdOrUrl.startsWith("../")) {
      return this.installFromLocalPath(packIdOrUrl.startsWith("file://") ? new URL(packIdOrUrl) : packIdOrUrl);
    }
    if (packIdOrUrl.startsWith("https://")) return this.installFromUrl(packIdOrUrl, { userId: opts.userId });

    const index = await this.fetchIndex();
    const entry = index.packs.find((pack) => pack.id === packIdOrUrl);
    if (!entry) throw new Error(`Pack not found in Shubur Marketplace: ${packIdOrUrl}`);
    const installed = await this.installFromUrl(entry.downloadUrl, { expectedSha256: entry.archiveSha256, userId: opts.userId, requireSignature: true });
    if (installed.id !== entry.id || installed.version !== entry.version || installed.priceTier !== entry.priceTier) {
      throw new Error("Pack manifest does not match its Shubur Marketplace registry entry.");
    }
    return installed;
  }

  async installFromUrl(url: string, opts: { expectedSha256?: string; userId?: string; requireSignature?: boolean } = {}): Promise<InstalledPack> {
    const bytes = await downloadBytes(url, "Pack download");
    if (opts.expectedSha256 && !verifyPackIntegrity(bytes, opts.expectedSha256)) throw new Error("Pack integrity check failed: SHA-256 mismatch.");
    if (!opts.expectedSha256 && !opts.requireSignature) opts.requireSignature = true;
    return this.unpackAndRecord(bytes, url, opts.requireSignature ?? true, opts.userId);
  }

  async installFromLocalPath(localPath: string | URL): Promise<InstalledPack> {
    const path = localPath instanceof URL ? localPath : resolve(localPath);
    const bytes = new Uint8Array(await readFile(path));
    return this.unpackAndRecord(bytes, path instanceof URL ? path.href : `file://${path}`, false);
  }

  private async unpackAndRecord(bytes: Uint8Array, sourceUrl: string, requireSignature: boolean, userId = "anonymous"): Promise<InstalledPack> {
    if (bytes.byteLength > MAX_DOWNLOAD_BYTES) throw new Error(`Pack manifest exceeds the ${MAX_DOWNLOAD_BYTES}-byte limit.`);
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
    catch { throw new Error("Invalid pack format: expected a JSON manifest."); }
    const manifest = validatePackManifest(parsed);
    if (manifest.signature) {
      if (!verifyPackManifestSignature(manifest)) throw new Error("Pack signature verification failed.");
    } else if (requireSignature) {
      throw new Error("Remote pack manifest must include a valid Ed25519 signature.");
    }
    if (manifest.priceTier === "paid" && !await this.entitlement.checkEntitlement(manifest.id, userId)) {
      throw new Error(`Not entitled to pack "${manifest.id}" — purchase required.`);
    }

    const folder = manifest.id.replaceAll(".", "__");
    const packDir = resolve(this.installDir, folder);
    if (!packDir.startsWith(`${this.installDir}/`)) throw new Error("Unsafe pack installation path.");
    await mkdir(this.installDir, { recursive: true, mode: 0o700 });
    await chmod(this.installDir, 0o700);
    try {
      if ((await lstat(packDir)).isSymbolicLink()) throw new Error("Pack installation target cannot be a symbolic link.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await mkdir(packDir, { recursive: true, mode: 0o700 });
    await chmod(packDir, 0o700);
    await writeFile(join(packDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });

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
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.some((item) => !isRecord(item) || typeof item.id !== "string" || typeof item.version !== "string" || typeof item.installPath !== "string")) {
        throw new Error("Installed pack index is malformed; it was left untouched.");
      }
      return parsed as InstalledPack[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async updateInstalledIndex(pack: InstalledPack): Promise<void> {
    const indexPath = join(this.installDir, "installed.json");
    const existing = await this.listInstalled();
    const updated = [...existing.filter((item) => item.id !== pack.id), pack];
    const temporary = `${indexPath}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(updated, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await chmod(temporary, 0o600);
    await rename(temporary, indexPath);
  }
}

/** The first built-in free pack: the generic Shubur Starter Apartment. */
export const STARTER_APARTMENT_PACK: PackManifest = {
  id: "com.avatar-gateway.starter-apartment",
  version: "0.2.0",
  name: "Starter Apartment",
  description: "A generic multi-room home with a configurable brick-style avatar and daily routine.",
  author: { name: "Shubur contributors" },
  licence: "Apache-2.0",
  priceTier: "free",
  categories: ["apartment"],
  compatibility: ">=0.2.0",
  keywords: ["apartment", "rooms", "day-cycle", "brick-avatar"],
  assets: [],
};
