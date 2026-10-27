# Self-hosting

The avatar-gateway protocol engine and Shubur packages are free and Apache-2.0. A local setup needs Node.js 22.12 or later and npm.

## Local development

```bash
npm install
npm run build
npm test
npm run dev
```

`npm run dev` starts the gateway on `127.0.0.1:4100` and the two demo sites on ports 4101 and 4102. The gateway stores SQLite data at `.avatar-gateway/gateway.sqlite`; set `GATEWAY_DB` to change the path. Generated local identities and gateway data are ignored by Git. Set `GATEWAY_HOST=0.0.0.0` only when remote clients must reach the service.

The local gateway uses HTTP/WSS. For direct HTTPS/WSS and optional mTLS, configure `GATEWAY_TLS_KEY`, `GATEWAY_TLS_CERT`, and `GATEWAY_TLS_CA` as described in the [hosting guide](hosting.md). A CA enables mandatory client certificates pinned to the registered site's SHA-256 fingerprint.

## Deployment limits

The v0.2 server is a single-process implementation. Token and request replay caches are held in memory, so multiple instances do not share replay state. Certificate issuance and rotation automation, backup and recovery guidance, production monitoring, abuse operations, and a container image are not included. `GATEWAY_HOSTED_MODE=1` requires tenant API keys and enforces API, visit, post, and DM-request quotas; tenant keys are not yet bound to sites, WebSocket traffic is not metered, and max-site/avatar quotas are not enforced. Shubur Cloud and the Marketplace registry are not deployed.

Do not expose an unreviewed development deployment as a production service. Keep gateway signing keys, client keys, CA private keys, provider credentials, and tenant API keys outside source control.
