# @avatar-gateway/sdk-web

Web component registration and TypeScript contracts for avatar-host integrations.

```ts
import { defineAvatarHost } from "@avatar-gateway/sdk-web";

defineAvatarHost();
```

This registers `<avatar-host>` in a browser; the current element displays “avatar coming soon.” The exported visitor capability types describe a planned integration contract. The sandboxed visitor iframe, capability bridge, and server-side key helper are not implemented yet. This package is licensed under Apache-2.0.
