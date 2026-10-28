# @avatar-gateway/gateway

The Avatar Gateway broker provides site and avatar registration, visit tokens (PASETO v4.public, short lived,
audience-bound and replay-protected), policy checks, chat relay, public page reads, moderation, social APIs, and a
hash-chained audit log. See [SPEC.md §5.1 and §7](../../SPEC.md).

## Storage

`GatewayStorage` uses SQLite through SQL.js, a pure JavaScript/WebAssembly SQLite build. Local development reads and
writes the `GATEWAY_DB` file (default `.avatar-gateway/gateway.sqlite`); set `GATEWAY_STORAGE=sqlite` to make this
explicit. The same storage API can use `BlobGatewayStorage`, which stores private SQLite snapshots in Vercel Blob.
The Vercel entrypoint in this package selects Blob storage by default on Vercel and expects the connected store's
environment credentials.

Blob writes use ETags as conditional writes. Requests within one warm function instance are serialized; when another
instance wins a concurrent update, this instance returns HTTP 409 so the caller can retry. It never silently replaces
newer data. Blob is still a single SQLite snapshot rather than a multi-writer database: high write concurrency and
large snapshots can add latency, and the hosted Hobby deployment does not provide durable WebSocket chat sessions.
Hosted visit-session WebSocket upgrades return 503 with self-hosting guidance; REST endpoints remain available.

The experimental Hobby deployment is `https://shubur-gateway.vercel.app`. It is a gateway endpoint, not a managed Shubur Cloud product: tenant provisioning is operator-controlled, and write conflicts require callers to retry. See [the hosting guide](../../docs/hosting.md) for its limits.
