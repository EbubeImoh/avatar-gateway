# Shubur Marketplace

Shubur Marketplace is the planned home for apartments, themes, avatar skins, props, and agent behaviours. The client and manifest format are in this repository; the public registry and pack publishing service are not deployed yet. No pack prices or creator revenue terms have been set.

## Install a manifest

The current installer handles JSON manifests from a local file, an HTTPS URL, or a registry index. It does not download/extract arbitrary archives or execute pack code.

After npm publication:

```bash
npx shubur@latest install ./my-pack/manifest.json
npx shubur@latest install https://packs.example/manifest.json
```

From this source checkout:

```bash
npm run build
node packages/cli/dist/cli.js install ./my-pack/manifest.json
```

The MCP tool is `shubur_install_pack`. IDs resolve through the configured marketplace registry; the default registry endpoint is not live yet, so use a local manifest or a signed HTTPS manifest in the meantime.

The TypeScript client can install and list local manifests:

```ts
import { PackRegistry } from "@avatar-gateway/marketplace";

const registry = new PackRegistry("https://registry.example", ".avatar-gateway/packs");
const installed = await registry.installFromLocalPath("./my-pack/manifest.json");
const allInstalled = await registry.listInstalled();
```

The installer writes only the manifest and local installation index. It does not yet unpack packaged asset files; the archive format is a future extension.

## Manifest format

```json
{
  "id": "com.example.apartment",
  "version": "1.0.0",
  "name": "Example Apartment",
  "description": "A compact apartment scene.",
  "author": { "name": "Example Studio", "url": "https://example.com" },
  "licence": "Apache-2.0",
  "priceTier": "free",
  "categories": ["apartment"],
  "compatibility": ">=0.2.0",
  "assets": [
    { "path": "src/scene.js", "sha256": "<64-hex-digest>", "licence": "Apache-2.0" }
  ],
  "keywords": ["apartment", "scene"]
}
```

| Field | Requirement |
|---|---|
| `id` | Lowercase reverse-domain style identifier, such as `com.example.apartment` |
| `version` | Semantic version |
| `name`, `description` | Non-empty display text |
| `author` | Non-empty name; optional HTTPS URL and email |
| `licence` | SPDX identifier or `proprietary` |
| `priceTier` | `free` or `paid` |
| `categories` | `apartment`, `skin`, `prop`, `theme`, `behaviour`, or `bundle` |
| `compatibility` | Version range for avatar-gateway |
| `assets` | Safe relative paths, SHA-256 digests, and per-asset licence notes |
| `signature`, `signerPublicKeyPem` | Optional together for local packs; required and verified for remote packs |

Asset paths cannot be absolute or contain `..`, backslashes, or URL schemes. Pack IDs are validated before being used in a filesystem path.

## Signatures and integrity

The manifest signature is Ed25519 over canonical JSON with sorted object keys, excluding only the `signature` field. The `signerPublicKeyPem` is included in the signed data. This verifies content integrity and that the embedded key signed it; by itself, it does not establish that the key belongs to a trusted author.

For registry installs, the index entry must include a SHA-256 digest for the exact manifest bytes. The download must be HTTPS, use the registry's origin, and cannot redirect. The fetched manifest must also have a valid signature and match the registry entry's ID, version, and price tier. Direct HTTPS installs require a valid signature.

Local files may be unsigned for development, but any supplied signature must verify. `verifyManifestAssets` checks declared asset digests when actual asset contents are supplied; the current JSON-only installer has no archive extraction step to provide those contents.

```ts
import { verifyPackIntegrity, verifyManifestAssets } from "@avatar-gateway/marketplace";

const archiveMatches = verifyPackIntegrity(manifestBytes, expectedSha256);
const { valid, failed } = verifyManifestAssets(manifest, assetContents);
```

## Paid packs and entitlement

The `EntitlementAdapter` interface is the integration point for a future payment or subscription provider. The default adapter denies paid packs. A host that explicitly injects an adapter can decide whether a tenant is entitled. There is no built-in checkout, billing provider, or revenue-share policy.

## Starter Apartment

The first-party free pack is `com.avatar-gateway.starter-apartment`. Its package and config are generic; see [Starter Apartment](./starter-pack.md). The Marketplace manifest describes the package, but the current JSON installer does not package or download its code assets.

## Creating and publishing

Create a valid manifest, compute SHA-256 digests for the actual assets, and sign the manifest with an Ed25519 key. Keep the private signing key outside the repository. A public registry submission and publishing workflow will be documented when the Shubur Marketplace service is available.
