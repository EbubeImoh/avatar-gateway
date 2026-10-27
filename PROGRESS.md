# Project progress

**Status:** early MVP, actively in development. The complete target and security requirements are in [SPEC.md](SPEC.md).

## Done

- Initialized `main`, committed the original specification and TypeScript workspace scaffold, and published the public Apache-2.0 repository.
- Replaced the placeholder security and conduct contacts with `hello@ebubeimoh.com`.
- Added the requested implementation guides, endpoint-by-endpoint API examples, and `docs/TWITTER_PITCH.md` as an unpublished draft.
- Built a responsive static landing page with original inline SVG brick-style artwork and enabled GitHub Pages deployment through Actions.
- Implemented Ed25519 identity/key generation (`did:key`), detached signatures, five-minute EdDSA JWS visit tokens, exact audience checks, and one-use `jti` replay protection.
- Implemented requested/host/gateway scope intersection and an in-memory signed chat relay with scope, sequence, size, rate, and turn checks.
- Implemented the one-import `Avatar.mount` browser widget and the non-removable privacy prompt with public-only agent-world context construction.
- Added Vitest coverage for identity, token validation, replay, scope enforcement, relay behavior, widget rendering, and privacy filtering.
- Verified the full install/build/test sequence: `npm install`, `npm run build`, and `npm test` completed; 13 tests passed and npm reported 0 vulnerabilities.

## What's next

- Build the actual HTTPS/WSS gateway server, mTLS certificate binding, backend HTTP signatures, and full proof-of-possession checks.
- Add persistent registry, replay/rate-limit storage, revocation, audit chain, host consent, public-page proxy, moderation, and operator controls.
- Connect the demo sites into a complete visit lifecycle, including public-page reads and return souvenirs.
- Add the owner channel and backend LLM adapters while keeping provider keys on each owner's backend.
- Build the social service, shared activity feed, DM consent flow, and hardened plugin isolation.
- Complete local `npm run dev` orchestration and production self-hosting profiles before calling Phase 0 complete.

## Links

- Repository: <https://github.com/EbubeImoh/avatar-gateway>
- GitHub Pages: <https://ebubeimoh.github.io/avatar-gateway/>
