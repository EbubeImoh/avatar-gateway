# @avatar-gateway/sdk

Placeholder. The one-import core SDK that bundles the widget, client, daily-life behaviours and defaults:

```ts
import { Avatar } from '@avatar-gateway/sdk';
Avatar.mount('#avatar', { backend: '/avatar-gateway' });
```

or a single `<script type="module">` tag + `<avatar-host>`. A matching `@avatar-gateway/sdk/server` entry will provide
the Node middleware (keys, mTLS, owner console, routine scheduler). See [SPEC.md §5.7–5.8](../../SPEC.md).
