# Project progress

**Status:** v0.2 complete. The complete target and security requirements are in [SPEC.md](SPEC.md).

## Done (v0.1)

- Initialized `main`, committed the original specification and TypeScript workspace scaffold, and published the public Apache-2.0 repository.
- Replaced the placeholder security and conduct contacts with `hello@ebubeimoh.com`.
- Added the requested implementation guides, endpoint-by-endpoint API examples, and `docs/TWITTER_PITCH.md` as an unpublished draft.
- Built a responsive static landing page with original inline SVG brick-style artwork and enabled GitHub Pages deployment through Actions.
- Implemented Ed25519 identity/key generation (`did:key`), detached signatures, five-minute EdDSA JWS visit tokens, exact audience checks, and one-use `jti` replay protection.
- Implemented requested/host/gateway scope intersection and an in-memory signed chat relay with scope, sequence, size, rate, and turn checks.
- Implemented the one-import `Avatar.mount` browser widget and the non-removable privacy prompt with public-only agent-world context construction.
- Added Vitest coverage for identity, token validation, replay, scope enforcement, relay behavior, widget rendering, and privacy filtering.
- Verified the full install/build/test sequence: `npm install`, `npm run build`, and `npm test` completed; 13 tests passed and npm reported 0 vulnerabilities.

## Done (v0.2)

- **Real HTTPS/WSS gateway server** (Fastify + `@fastify/websocket`): site registration, avatar registration, directory, visit lifecycle (request → active → ended), token exchange, WebSocket chat relay, public-page proxy, revocations, append-only audit log with SHA-256 chaining, gateway metadata endpoint, health check.
- **SQLite persistence** (`better-sqlite3`) behind `GatewayStorage`: sites, avatars, visits, token replay, revocations, audit, profiles, posts, follows, DMs, activity feed. In-memory default for tests.
- **HTTP message signatures** (x-ag-ts / x-ag-nonce / x-ag-sig header pattern) for gateway→site hook delivery; mTLS helper for cert-fingerprint binding.
- **LLM adapters** (`packages/avatar-runtime/src/providers/`): OpenAI, Anthropic, and OpenAI-compatible/local — all use the caller's own API key; no keys committed.
- **Social layer** (all wired into the gateway server): profiles, timelines/posts, follows (open/approve/closed), DMs (consent-gate + store-and-forward), shared activity feed.
- **`npm run dev`** starts gateway + both demo sites via `concurrently`.
- **Shubur branding**: the agent social network is named **Shubur** (`@avatar-gateway/shubur`). Applied across README, landing page, docs, and `docs/TWITTER_PITCH.md`. The `packages/social/` directory has been renamed to `packages/shubur/`.
- **Starter Apartment** (`@avatar-gateway/starter-apartment`): drop-in apartment scene replicating the "lives its day" concept from Ebube's portfolio. React `<ApartmentScene>` + plain `mount()`, wired to `Avatar.mount`. Typed `ApartmentConfig`, day-cycle (default: Africa/Lagos), configurable look/room/furniture/lighting.
- **Monetisation — open-core model**: tenant system in gateway (`TenantRecord`, per-tenant quotas, usage metering events, `BillingAdapter` interface). `POST /v1/tenants` and `GET /v1/tenants/:id/usage` REST endpoints. No payment provider hard-wired.
- **Marketplace** (`@avatar-gateway/marketplace`): `PackManifest` + `RegistryEntry` + `InstalledPack` types. `PackRegistry` class: fetch registry index, search, install from id/URL/local path, verify SHA-256, list installed. `EntitlementAdapter` interface. Starter Apartment is the first free pack (`com.avatar-gateway.starter-apartment`).
- **MCP server** (`@avatar-gateway/mcp`): MCP server (stdio transport, `--http` flag stub for streamable HTTP) with 13 registered tools: `avatar_gateway_status`, `init`, `create_identity`, `connect_gateway`, `register_avatar`, `create_shubur_profile`, `post`, `follow`, `dm_request`, `start_visit`, `stop_visit`, `install_pack`, `customise_apartment`. Config read/write to `.avatar-gateway/config.json`.
- **CLI** (`@avatar-gateway/cli`): `npx avatar-gateway@latest init` — interactive (readline) + `--yes` mode. Framework detection (Next.js, React+Vite, Vite, plain HTML). Writes identity, scaffold files, config. `create-avatar-gateway` alias.
- **Docs**: `docs/hosting.md` (self-host + Shubur Cloud coming soon), `docs/marketplace.md` (pack format, entitlement), `docs/BUSINESS.md` (open-core model, no invented prices), `docs/mcp.md` (copy-paste MCP config for Claude Code, Cursor, Windsurf, Codex).
- **Landing page**: 3-step quickstart, MCP config snippet, self-host vs hosted section, marketplace section.
- **README**: 3-step quickstart at top, open-core statement, all packages listed, all new docs linked.
- **Tests**: 116 tests pass across 10 suites.

## How to run

```bash
npm install
npm run build
npm test        # 116 tests, 10 suites
npm run dev     # gateway on :4100, demo-site-a on :3001, demo-site-b on :3002
```

Set LLM provider env vars before `npm run dev`:

```bash
export OPENAI_API_KEY=sk-...          # for OpenAI
export ANTHROPIC_API_KEY=sk-ant-...   # for Anthropic
# or set OPENAI_BASE_URL for a local/compatible model
```

## What's next

- Complete mTLS enforcement (cert binding and peer verification in production TLS paths).
- Full proof-of-possession token checks and grant signature verification in `/v1/tokens/exchange`.
- Demo sites: wire the complete visit flow end-to-end with LLM responses and the avatar widget.
- Production self-hosting profile: Docker Compose, environment guide, ops docs.
- Moderation, operator controls, and spam signals for Shubur.
- Plugin isolation and sandboxed plugin execution.
- Starter Apartment: React-rendered SVG → canvas option for richer animation; WASD walk between rooms.

## Links

- Repository: <https://github.com/EbubeImoh/avatar-gateway>
- GitHub Pages: <https://ebubeimoh.github.io/avatar-gateway/>
- Starter Apartment docs: [docs/starter-pack.md](docs/starter-pack.md)
- Shubur social network docs: [docs/social-network.md](docs/social-network.md)
- Hosting guide: [docs/hosting.md](docs/hosting.md)
- Marketplace: [docs/marketplace.md](docs/marketplace.md)
- Business model: [docs/BUSINESS.md](docs/BUSINESS.md)
- MCP server: [docs/mcp.md](docs/mcp.md)
