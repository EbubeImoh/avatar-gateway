# Marketplace

The avatar-gateway marketplace is a registry of **packs** — bundles of apartment scenes, avatar skins, props, room themes, and agent behaviours. The Starter Apartment is the first free pack.

---

## Installing a pack

### Via MCP (Claude Code / Cursor)

```
Use the avatar_gateway_install_pack tool with pack: "com.avatar-gateway.starter-apartment"
```

### Via CLI

```bash
npx avatar-gateway@latest install com.avatar-gateway.starter-apartment
```

### Via the SDK

```ts
import { PackRegistry } from "@avatar-gateway/marketplace";

const registry = new PackRegistry();
await registry.install("com.avatar-gateway.starter-apartment");
```

### From a local path (development)

```ts
await registry.installFromLocalPath("./my-pack/manifest.json");
```

---

## Pack format

A pack is a JSON manifest file (binary zip support is a future extension).

```json
{
  "id": "com.myname.my-pack",
  "version": "1.0.0",
  "name": "My Pack",
  "description": "A one-line description.",
  "author": {
    "name": "Your Name",
    "url": "https://yoursite.com"
  },
  "licence": "Apache-2.0",
  "priceTier": "free",
  "categories": ["apartment"],
  "compatibility": ">=0.2.0",
  "assets": [
    {
      "path": "src/index.ts",
      "sha256": "<sha256-of-file>",
      "licence": "Apache-2.0"
    }
  ],
  "keywords": ["apartment", "minimal"]
}
```

### Fields

| Field | Required | Description |
|---|---|---|
| `id` | ✓ | Reverse-domain scoped id, e.g. `com.yourname.pack-name` |
| `version` | ✓ | Semver string |
| `name` | ✓ | Human-readable display name |
| `description` | ✓ | One-line description |
| `author` | ✓ | `{ name, url?, email? }` |
| `licence` | ✓ | SPDX identifier or `"proprietary"` |
| `priceTier` | ✓ | `"free"` or `"paid"` |
| `categories` | ✓ | Array of `PackCategory` values |
| `compatibility` | ✓ | avatar-gateway semver range |
| `assets` | ✓ | Array of `PackAsset` (path + sha256 + licence) |
| `signature` | — | Ed25519 signature of the canonical manifest JSON |
| `signerPublicKeyPem` | — | Author's public key for signature verification |
| `keywords` | — | For discovery |
| `preview` | — | Path to a preview image inside the pack |

### Categories

`apartment` · `skin` · `prop` · `theme` · `behaviour` · `bundle`

### Price tiers

- `free` — no entitlement check, always accessible
- `paid` — requires an entitlement check via `EntitlementAdapter` (future: Stripe/Paystack adapters)

---

## Creating and publishing a pack

1. Write your pack manifest and assets.
2. Compute SHA-256 for each asset file.
3. Sign the manifest with your Ed25519 key (optional but recommended for paid packs).
4. Submit to the registry: **publishing workflow TBD** — watch the repo for updates.

---

## EntitlementAdapter

For paid packs on a self-hosted gateway, implement your own entitlement check:

```ts
import type { EntitlementAdapter } from "@avatar-gateway/marketplace";

export class MyEntitlementAdapter implements EntitlementAdapter {
  async checkEntitlement(packId: string, userId: string): Promise<boolean> {
    // check your database / Stripe subscription
    return true;
  }
}
```

Pass it to `PackRegistry`:

```ts
const registry = new PackRegistry(undefined, undefined, new MyEntitlementAdapter());
```

Hosted adapters (Stripe, Paystack) are planned as future packages — no prices or terms are set yet.

---

## Integrity verification

The SDK verifies SHA-256 checksums for all downloaded archives:

```ts
import { verifyPackIntegrity, verifyManifestAssets } from "@avatar-gateway/marketplace";

// Verify the archive download
const ok = verifyPackIntegrity(archiveBytes, entry.archiveSha256);

// Verify individual asset files match the manifest
const { valid, failed } = verifyManifestAssets(manifest, assetContents);
```
