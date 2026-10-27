/**
 * Pack manifest and entitlement types for the avatar-gateway marketplace.
 *
 * A "pack" bundles apartment scenes, avatar skins, props, room themes, and/or
 * agent behaviours. Packs are versioned, signed, and listed in a registry.
 * The starter apartment is the first free pack.
 */

export type PackPriceTier = "free" | "paid";
export type PackCategory = "apartment" | "skin" | "prop" | "theme" | "behaviour" | "bundle";

export interface PackAsset {
  /** Relative path inside the pack archive (e.g. "src/index.js"). */
  path: string;
  /** SHA-256 hex digest of the file contents. */
  sha256: string;
  /** SPDX licence identifier or "proprietary". */
  licence: string;
  /** Original author/source credit (required for third-party assets). */
  credit?: string;
}

export interface PackManifest {
  /** Reverse-domain scoped pack id, e.g. "com.avatar-gateway.starter-apartment". */
  id: string;
  /** Semver string. */
  version: string;
  /** Human-readable display name. */
  name: string;
  /** One-line description. */
  description: string;
  /** Author info. */
  author: {
    name: string;
    url?: string;
    email?: string;
  };
  /** SPDX licence for the pack as a whole. */
  licence: string;
  /** "free" packs are always accessible; "paid" packs require an entitlement check. */
  priceTier: PackPriceTier;
  /** Pack categories (a bundle can include multiple). */
  categories: PackCategory[];
  /** avatar-gateway version range this pack is compatible with (semver range). */
  compatibility: string;
  /** List of all bundled assets with their checksums and licence notes. */
  assets: PackAsset[];
  /** Ed25519 signature of the canonical manifest JSON (excluding this field). */
  signature?: string;
  /** Public key PEM of the pack author for signature verification. */
  signerPublicKeyPem?: string;
  /** Keywords for discovery. */
  keywords?: string[];
  /** Screenshot or preview image path inside the pack. */
  preview?: string;
}

/** A pack entry as it appears in the registry index. */
export interface RegistryEntry {
  id: string;
  version: string;
  name: string;
  description: string;
  priceTier: PackPriceTier;
  categories: PackCategory[];
  author: string;
  downloadUrl: string;
  /** SHA-256 of the full pack archive. */
  archiveSha256: string;
}

/** Registry index returned by GET <registryUrl>/index.json */
export interface RegistryIndex {
  version: "1";
  updatedAt: string;
  packs: RegistryEntry[];
}

/** Installed pack record (written to .avatar-gateway/packs/). */
export interface InstalledPack {
  id: string;
  version: string;
  name: string;
  installedAt: string;
  installPath: string;
  priceTier: PackPriceTier;
}

/**
 * Entitlement adapter interface — no payment provider hard-wired.
 * Implement this to integrate Stripe, Paystack, or any other system.
 *
 * Future documented adapters: StripeEntitlementAdapter, PaystackEntitlementAdapter.
 */
export interface EntitlementAdapter {
  /** Returns true if the calling user/tenant is entitled to use this pack. */
  checkEntitlement(packId: string, userId: string): Promise<boolean>;
  /** Called after a successful purchase. */
  onPurchase?(packId: string, userId: string, amount: number, currency: string): Promise<void>;
}

/** No-op entitlement adapter that always allows access (used for free packs + self-hosted). */
export class OpenEntitlementAdapter implements EntitlementAdapter {
  async checkEntitlement(_packId: string, _userId: string): Promise<boolean> { return true; }
}
