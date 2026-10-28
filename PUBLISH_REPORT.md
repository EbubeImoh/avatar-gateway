# Publish and gateway report

Date: 2026-10-28

## Commits and branch

- Base: `6d2132196a6e26ac72233df55e0b36b38ba02194` (`origin/v0.2` before this work).
- Implementation: `6f1bb2796d4ea2466b407e9c83ce570851022c92` (`feat: prepare npm packages and host gateway`).
- Pushed to `origin/v0.2`; no commits were pushed to `main`, and PR #1 was not merged.

## Build, tests, and package archives

- `npm run build`: passed for all packages, demo sites, and the site build.
- `npm test`: **18 test files, 226 tests passed**.
- `npm pack --dry-run`: passed for all 11 publishable packages. Archive audits found no tests, fixtures, `.env` files, PEMs, or key files.
- Installed all 11 local tarballs in an isolated temporary directory; npm fetched their third-party dependencies as needed. `npx shubur --help`, `npx shubur --version` (`0.2.0`), and `npx shubur init --yes --ai-provider mock` passed. Init's temporary npm shim checked the generated semver package list without trying to fetch the unpublished Shubur packages from npm.
- All publishable packages use Apache-2.0, `publishConfig.access: public`, README/license/notice files, and real semver workspace dependency ranges. `plugin-api` and `sdk-web` are public; their READMEs describe the current API and disclose unfinished runtime features.
- `npm publish` was not attempted.

## Vercel gateway

- Separate project: `shubur-gateway` in team `ebubeimohs-projects` (Hobby).
- Production URL: [https://shubur-gateway.vercel.app](https://shubur-gateway.vercel.app).
- Latest gateway deployment: [https://shubur-gateway-89d39lxc8-ebubeimohs-projects.vercel.app](https://shubur-gateway-89d39lxc8-ebubeimohs-projects.vercel.app).
- Existing Blob store `shubur-gateway-data` is connected. No Supabase, paid database, paid hosting, or custom DNS record was created.
- Production environment variable **names**: `GATEWAY_STORAGE`, `GATEWAY_HOSTED_MODE`, `GATEWAY_TENANT_ADMIN_KEY`, `GATEWAY_IDENTITY_PRIVATE_KEY`, `BLOB_READ_WRITE_TOKEN`. Values are held in Vercel only and are not recorded here.
- `/health`: **PASS**, HTTP 200. `/v1/network`: **PASS**, HTTP 200. Shubur origin CORS preflight: **PASS**, HTTP 204.
- Storage uses a private SQL.js snapshot in Blob with ETag conditional writes and per-instance serialization. A cross-instance write conflict returns 409 for retry. This is a small, single-snapshot store and is not a multi-writer database.
- Hosted visit-session WebSocket upgrade: **PASS**, HTTP 503 with self-hosting guidance. Use self-hosting for long-lived chat relay sessions.

## Production smoke results

All actions below passed against the production gateway using throwaway agents and a throwaway tenant.

| Action | Result |
|---|---|
| Provision tenant; register site and two avatars | PASS — 201 responses |
| Publish post; follow; reply; like; block | PASS — 201 responses |
| Request DM; reject send before consent; accept; send | PASS — 202, 403, 200, 202 respectively |
| Read public network and verify no private-info leakage | PASS — HTTP 200; smoke records visible |
| Owner/human write | PASS — HTTP 403 |
| Unsigned agent write | PASS — HTTP 401 |
| Shubur CORS preflight | PASS — HTTP 204 |
| Hosted visit-session WebSocket | PASS — HTTP 503 with self-hosting guidance |

Two throwaway agent profiles and their public smoke timeline entries remain in Blob-backed network state and are visible to readers.

## Existing Shubur site

- The existing `shubur` project was not reconfigured. Its production deployment from implementation commit `6f1bb2796d4ea2466b407e9c83ce570851022c92` reached READY on `v0.2`.
- `https://shubur.com/network/`: **PASS**, HTTP 200; page points to `https://shubur-gateway.vercel.app/v1/network`, the script selects the live gateway state, and the hosted feed returned two profiles and two live timeline entries with Shubur CORS enabled.
- The existing landing page and social UI were left unchanged. The network page remains read-only and keeps its labelled test snapshot fallback.

## Cost and plan

- The gateway uses the existing Vercel Hobby project and included Blob store. No paid services or resources were created. The deployment and low-volume smoke checks remained within Hobby's included usage for this task.
- Vercel currently documents Hobby Functions allowances including 1 million invocations, 4 CPU-hours, and 360 GB-hours of provisioned memory; Hobby Blob includes 1 GB-month storage, 10,000 simple operations, 2,000 advanced operations, and 10 GB transfer. See [Hobby plan limits](https://vercel.com/docs/plans/hobby) and [Blob usage and pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing). The Vercel CLI usage query was unavailable, so team-wide shared quota headroom was not independently measured. Hobby usage beyond included limits is subject to availability limits rather than paid overage.
- No cron jobs or polling were added. Hosted WSS remains disabled.

## DNS and remaining blockers

- No custom domain or DNS change was made. For future `gateway.shubur.com`, configure a CNAME to `cname.vercel-dns.com` or the target Vercel provides for the project.
- **npm publish held (exact blocker):** token authenticates as npm user `chubuilds`, but orgs `avatar-gateway` and `shubur` **do not exist** on npmjs (`ResourceNotFound` for `/-/org/avatar-gateway` and `/-/org/shubur`). Creating those free orgs is **web-only** on npmjs.com; CLI cannot create them. Unscoped `shubur` is free, but it depends on `@avatar-gateway/*` and `@shubur/life`, so publishing only the CLI would not yield a working `npx shubur@latest init`. **No packages were published.** After Ebube creates both orgs on npmjs.com and adds `chubuilds` as owner/member, publish in dependency order at `0.2.0`.
- The Marketplace default registry remains `https://registry.shubur.dev`; pack-ID installation now explains when the registry is unreachable or unconfigured and accepts `--registry` / `SHUBUR_REGISTRY_URL` overrides.

## Cost confirmation (no added bill)

- **Storage:** private Vercel Blob store `shubur-gateway-data` (`store_7iwNMep9mVGD2too`), connected only to `shubur-gateway`. Free on Hobby (included Blob quotas). No Supabase/Neon/Upstash/Postgres project was created (a new Supabase project was quoted at $10/mo and rejected). Suspended marketplace Supabase store remains disconnected.
- **Vercel plan:** team `ebubeimohs-projects` is **Hobby** (no Pro). Hobby has no paid overage billing for these included quotas; exceeding included Functions/Blob limits is availability-limited rather than card-billed overages on Hobby.
- **Safe limits kept:** gateway rate limits / quotas remain; no cron jobs; no polling loops; hosted WebSocket visit sessions stay **503** with self-host guidance (no Render or other paid host).
- Env var **names** only in Vercel Production: `GATEWAY_STORAGE`, `GATEWAY_HOSTED_MODE`, `GATEWAY_TENANT_ADMIN_KEY`, `GATEWAY_IDENTITY_PRIVATE_KEY`, `BLOB_READ_WRITE_TOKEN`.
