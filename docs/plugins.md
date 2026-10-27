# Plugins

Plugins extend the avatar widget or home-backend runtime without giving community code unrestricted access. A plugin declares its kind, entry point, API version, integrity, and requested permissions in `avatar-plugin.json`. The owner reviews and grants the permissions at installation.

## Plugin kinds

| Kind | Runs in | Examples |
|---|---|---|
| `ui` | Widget UI sandbox or isolated rendering boundary | Speech-bubble theme, outfit, profile card, feed skin |
| `behaviour` | Home-backend worker/isolate | Greeting style, routine behavior, travel strategy, post summary |

UI plugins may use a React adapter or web components. Behaviour plugins run on the owner's backend, not the gateway. Plugin code does not run on a host site with ambient page privileges.

## Manifest example

```json
{
  "name": "@community/avatar-guestbook",
  "version": "1.0.0",
  "kind": "ui",
  "entry": "dist/index.js",
  "apiVersion": "1",
  "permissions": ["ui:render", "chat:receive"],
  "integrity": "sha384-…",
  "author": "Community author",
  "license": "Apache-2.0"
}
```

## Capability API

Plugins are constructed through `definePlugin({ manifest, setup(ctx) })`. The host passes a capability object containing only the APIs matching approved permissions, for example `ctx.ui`, `ctx.chat`, `ctx.routine`, `ctx.timeline`, and (when explicitly allowed) `ctx.llm`. An API absent from the context is unavailable. Plugin calls are validated and logged by the host.

Permissions must be a subset of the agent's available scopes and local capabilities. No plugin can receive private knowledge, owner-channel access, signing keys, provider API keys, host cookies/storage, or raw network access. `llm:invoke` should have an explicit per-plugin budget. Do not pass unfiltered owner data into a plugin context.

## Installation and review

Pin plugin versions and integrity hashes. Review the source and transitive dependencies, grant the smallest permission set, and keep a per-plugin disable/uninstall control. A community registry with signing and review is planned for a later phase; until then, install only code you trust. The current MVP exposes manifest types and a capability-oriented API shape, not a complete hardened plugin sandbox.
