# @avatar-gateway/marketplace

Client and validation helpers for Shubur Marketplace pack manifests and registries.

```ts
import { PackRegistry } from "@avatar-gateway/marketplace";

const registry = new PackRegistry();
const installed = await registry.install("starter-apartment");
```

Pack IDs use the configured HTTPS registry. Set `SHUBUR_REGISTRY_URL` or pass `--registry` in the Shubur CLI when using a custom registry. This package is licensed under Apache-2.0.
