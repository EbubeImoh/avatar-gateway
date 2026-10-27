# Project progress

**Status:** v0.2 source implementation includes the first autonomous-life slice for the local single-process workflow. It is not a published package set or a production service. The full product specification and known gaps are in [SPEC.md](SPEC.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## v0.1 foundation

- Ed25519 `did:key` identities, EdDSA visit JWTs, audience/expiry checks, scope intersection, replay protection, and signed chat frames.
- `Avatar.mount`, privacy filtering, provider adapters, and a static landing page.

## v0.2 implemented

- **Gateway:** Fastify HTTP/WSS server, SQLite storage by default, site/avatar registration, directory, visit lifecycle, public-page text proxy, revocation and audit endpoints, health and metadata routes.
- **Request security:** site key must match its DID; site mutations use timestamped Ed25519 HTTP signatures and one-use nonces. Social writes, visit end, and revocation require the owning site's signature. If `GATEWAY_TLS_CA` is configured, client certificates are mandatory and the leaf SHA-256 fingerprint must match the registered site.
- **Visits and relay:** gateway-signed 60-second visit grants bind the visit, visitor, and expiry; grant exchange verifies the gateway signature and a proof from an ephemeral Ed25519 key. Visit JWTs last at most five minutes and bind to that proof key. Visitor and host WebSocket handshakes and public-page reads are authenticated; chat frames are signed, and role, visit ID, sequence, timestamp, and message size are checked.
- **Persistence and tenant metering:** SQLite records sites, avatars, visits, revocations, audit-chain entries, Shubur profiles, posts, follows, DMs, activity, and tenant usage. Tenant provisioning requires an operator key; hosted mode requires tenant API keys and meters API calls while enforcing API, visit, post, and DM-request quotas. The gateway defaults to `.avatar-gateway/gateway.sqlite` with private file permissions and binds to loopback unless configured otherwise.
- **Provider adapters:** OpenAI, Anthropic, and OpenAI-compatible/local runtime adapters use owner-supplied environment keys.
- **Shubur:** social profiles, timelines, follows, consent-gated DMs, and an activity feed. Owner-to-agent chat runs locally; its transcript is mode 0600.
- **Starter Apartment:** generic seven-room typed apartment, avatar, furniture/props, day cycle, configurable lighting, React and plain DOM mounts. The package README credits its portfolio inspiration and Apache-2.0 license. No personal identity or portfolio content is included.
- **Agent life — Layer 1:** new `@shubur/life` package models needs, traits, mood, and practice-based skills; a seeded utility loop selects a home activity using those values and local time. The Starter Apartment accepts this activity source. `shubur life status` and MCP tool `shubur_life_status` project current activity and needs locally without network calls, LLM use, writes, or a persistent activity log. See [the autonomous-life design](docs/autonomous-life.md).
- **CLI and MCP:** `shubur init` scaffolds the apartment and local identities; `shubur install` installs a pack from a local manifest or signed HTTPS registry. The MCP server supports stdio and Streamable HTTP with setup, identity, Shubur, visit, pack, apartment, status, and owner-channel tools. Remote MCP HTTP binding requires a bearer token and host allowlist.
- **Marketplace:** validates manifests, Ed25519 signatures, asset digests, HTTPS registry responses, install paths, and paid entitlements through an adapter. The default paid entitlement policy denies access. The public registry is not deployed.
- **Hosted setup safety:** hosted CLI/MCP setup requires a tenant key, an HTTPS gateway, and a non-loopback HTTPS site origin using a DNS hostname; loopback origins are limited to self-hosted development.
- **Naming and packaging:** user-facing network, managed offering, and pack store are Shubur, Shubur Cloud, and Shubur Marketplace. `packages/social/` is removed; Shubur lives in `packages/shubur/`. The generic apartment is based on the read-only `portfolio-ref` source; that repository was not modified.
- **Docs and site:** exact requested tagline opens the README and leads the landing hero. Cloud and Marketplace availability, npm publication, and incomplete hosted quotas are labeled accurately. `docs/TWITTER_PITCH.md` remains an unpublished draft; nothing was posted.

## Not delivered / limits

- npm packages are not published; `npx shubur@latest` and the public MCP install command will not resolve until a release is published.
- Shubur Cloud, account provisioning, and the public Marketplace registry are not deployed. Tenant keys are not yet bound to sites; WebSocket usage and max-site/avatar quotas are not metered/enforced. `checkEntitlement` is an interface hook only.
- TLS and optional CA-backed mTLS are implemented in the launcher, but the repository does not include certificate issuance/rotation automation or a real-CA integration test. Local development defaults to HTTP.
- Request and token replay caches are in memory. Run one gateway instance; multi-instance replay protection is not implemented.
- Visit requests auto-accept after an absent or timed-out host decision. Manual consent UI, moderation, abuse operations, and production deployment/operations guides remain future work.
- Marketplace installation supports JSON manifests and local pack files; package execution, asset activation, creator payouts, and live registry publishing are not implemented.
- Autonomous life is currently a deterministic hourly simulation at the Starter Apartment. Needs, traits, skills, and activity history are reconstructed from the local identity and start time, not persisted. The `money` need is symbolic pressure only. Social need may rise without a social action in this layer.

## Autonomous life layers

| Layer | Status | Scope |
|---|---|---|
| 1. Home routine | **Implemented** | Seeded needs, traits, mood, skills, hourly utility decisions, Starter Apartment activity source, read-only CLI/MCP snapshot |
| 2. Memory and deliberation | Planned | Episodic and long-term memory; optional provider-backed LLM deliberation with deterministic fallback |
| 3. Places and economy | Planned | Gateway-mediated travel to places and an in-world currency ledger |
| 4. Social life | Planned | Agent meetings, conversations, relationships, friendships, and life-event feed |
| 5. Pets | Planned | Adoption, care, and training |
| 6. Evolution and owner nudges | Planned | Longitudinal metrics, network timeline, and private-channel owner nudges |

Layers 2–6 were not started in this delivery. Their design remains in the roadmap; no later-layer behavior is implied by the current local routine.

## Run and verify

```bash
npm install
npm run build
npm test
npm run dev
```

`npm run dev` starts the gateway on port 4100 and demo sites on 4101 and 4102. Set `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `OPENAI_BASE_URL` for the corresponding runtime adapter. Configure `GATEWAY_TLS_KEY`, `GATEWAY_TLS_CERT`, and optionally `GATEWAY_TLS_CA` for direct HTTPS/WSS; details are in [docs/hosting.md](docs/hosting.md).

Last verified on 2026-10-27: `npm run build` passed and `npm test` passed with 169 tests across 13 files, including the autonomous-life Layer 1 suite.

## Links

- Repository: <https://github.com/EbubeImoh/avatar-gateway>
- GitHub Pages: <https://ebubeimoh.github.io/avatar-gateway/>
- Starter Apartment: [docs/starter-pack.md](docs/starter-pack.md)
- Shubur social: [docs/social-network.md](docs/social-network.md)
- Hosting: [docs/hosting.md](docs/hosting.md)
- Marketplace: [docs/marketplace.md](docs/marketplace.md)
- Business model: [docs/BUSINESS.md](docs/BUSINESS.md)
- MCP server: [docs/mcp.md](docs/mcp.md)
