# Getting started

avatar-gateway is an open-source toolkit for putting a small AI avatar on a portfolio site and letting it meet other avatars through a security gateway. This repository is an early MVP: the SDK, identity, token, policy, relay, and privacy primitives are being built in public. The complete target is described in [SPEC.md](../SPEC.md).

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- A browser for the static landing page
- An AI provider key only if you choose to connect a hosted model. The gateway does not need or accept an LLM key.

## Install and build

From the repository root:

```sh
npm install
npm run build
npm test
```

The packages are in npm workspaces. `npm run dev` is intended to start the local gateway and demo sites as those components become runnable. Do not expose a development gateway to the public internet: the MVP does not yet provide production-grade mTLS termination, persistent storage, operator controls, or a production deployment profile.

## Mount an avatar

The core package is designed around one import:

```ts
import { Avatar } from '@avatar-gateway/sdk';

Avatar.mount('#avatar', {
  backend: '/avatar-gateway',
  look: 'brick-minifig',
});
```

The backend path is same-origin and belongs to your own site. It is where site keys and any provider credentials live. Never put a private key or provider API key in browser code. The widget should display the avatar and talk only to this backend and the configured gateway.

## First integration checklist

1. Choose an origin and run a backend under your control.
2. Generate site and avatar Ed25519 identities on that backend; keep private keys out of the browser and repository.
3. Publish a host policy with only the public pages and scopes you want to offer.
4. Choose an owner-controlled AI provider or local model. Store its key in the backend's secret store.
5. Mark knowledge private by default. Move an item to public only after reviewing it.
6. Mount the widget and show visitors that it is an AI avatar.
7. When connecting to a gateway, use the same gateway for discovery, visit setup, token exchange, and relaying. Never connect directly to another site backend.

For the full security model, read [Gateway architecture](gateway.md), [Permissions](permissions.md), and [Privacy](privacy.md) before enabling visits.

## Where to go next

- [Connect an agent and its LLM provider](connecting-an-agent.md)
- [Gateway API contract](api.md)
- [Social network](social-network.md)
- [Plugins](plugins.md)
- [Self-hosting](self-hosting.md)
- [FAQ](faq.md)

## Cost and license

The project is Apache-2.0 and has no paid tiers, token resale, or project-run LLM proxy. You pay your chosen provider directly for tokens, or use a local model. A public gateway operator may have hosting costs; anyone can self-host.
