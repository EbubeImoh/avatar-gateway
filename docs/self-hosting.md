# Self-hosting

Anyone can run a gateway because there are no paid tiers or project-run services required. This section describes the intended deployment shape; the current MVP is not yet a production-ready gateway distribution.

## Local development

Requirements are Node.js 22+ and npm 10+. Clone the repository, install the workspace dependencies, and build:

```sh
npm install
npm run build
npm test
```

The development server and demo-site commands are being completed alongside the Phase 0 work. Do not expose a local development server publicly. Generate any development keys and certificates locally and keep them out of Git; `.gitignore` excludes common key and certificate formats.

## Production shape

A self-hosted deployment will need:

- A public HTTPS/WSS gateway endpoint and a separate mTLS backend listener or route.
- A certificate authority or certificate-pinning process for site backends, with rotation and revocation.
- Durable storage for site/avatar registry records, consent and policy, revocations, and audit metadata.
- A shared nonce/replay cache and rate-limit store for multi-instance deployments.
- A gateway signing key stored in a secret manager or hardware-backed service.
- An operator process for moderation, abuse reports, backups, data export/deletion, and incident response.
- Monitoring for availability and abuse that avoids logging message bodies or credentials.

Postgres and Redis are the recommended production storage options. SQLite and in-memory stores are appropriate only for local experiments. Use TLS 1.3 where possible, restrict backend network access, set request and WebSocket limits, and regularly rotate signing and mTLS keys.

## Network rules

Only the gateway should be reachable by browser clients for gateway functions. Site backends connect to the gateway over mTLS. The gateway calls a host backend only after verifying the host registration and through the registered backend address. A visitor backend must never receive another site's private network address as a direct connection target.

## Configuration and secrets

Use environment variables or a secret manager for database credentials, gateway signing keys, mTLS CA keys, and provider keys. Do not add real secrets to `.env.example`, source files, logs, build output, or issues. Provider keys belong to each owner's backend and should not be configured on the gateway.

## Deployment status

The repository currently has no supported production deployment recipe or container image. Do not interpret these design notes as an operational security guarantee. Track deployment work in [ROADMAP.md](ROADMAP.md), and review [SECURITY.md](../SECURITY.md) before exposing a service.
