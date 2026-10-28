# @avatar-gateway/plugin-api

TypeScript contracts for Avatar Gateway UI and behavior plugins.

```ts
import { definePlugin, type PluginDefinition } from "@avatar-gateway/plugin-api";

const plugin: PluginDefinition = definePlugin({
  manifest: {
    name: "hello-widget",
    version: "1.0.0",
    kind: "ui",
    entry: "dist/index.js",
    apiVersion: "1",
    permissions: ["ui:render"],
  },
  setup(context) {
    context.ui?.render("Hello from a plugin");
  },
});
```

The package exports manifest/context types, `definePlugin()`, and a list of permissions plugins must never receive. It does not load plugins or enforce permissions at runtime; hosts must validate grants and provide only approved capabilities. This package is licensed under Apache-2.0.
