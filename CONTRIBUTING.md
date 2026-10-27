# Contributing to avatar-gateway

Thanks for your interest! The project is at the **spec / pre-alpha** stage, so the most valuable contributions
right now are reviews of [SPEC.md](./SPEC.md), especially the threat model and API.

## Ways to contribute

- **Spec feedback:** open an issue labelled `spec` or a PR editing `SPEC.md`. Reference the section number.
- **Open questions:** see SPEC.md §13 — proposals welcome.
- **Code:** pick an issue labelled `good first issue` or `phase-0`. Please discuss larger changes in an issue first.
- **Security issues:** do **not** open public issues — see [SECURITY.md](./SECURITY.md).

## Development

```bash
# Node.js >= 22
npm install
npm run build
npm test
```

Monorepo layout: `packages/sdk`, `packages/plugin-api`, `packages/gateway`, `packages/sdk-web`, `packages/avatar-runtime`, `packages/social`, `examples/demo-site-a`, `examples/demo-site-b`.

## Pull request guidelines

1. Fork and create a topic branch (`feat/…`, `fix/…`, `docs/…`, `spec/…`).
2. Keep PRs focused; include tests for behaviour changes (security-relevant code **must** have tests,
   including negative tests: expired/replayed/wrong-audience tokens, forbidden scopes, etc.).
3. Use [Conventional Commits](https://www.conventionalcommits.org/) in commit messages.
4. Run `npm run build && npm test` before pushing.
5. Sign off your commits (`git commit -s`) to certify the [Developer Certificate of Origin](https://developercertificate.org/).
6. Changes to the protocol, scopes, or crypto require a spec update in the same PR.

## Design rules (non-negotiable)

- Deny by default — never add a capability that lets a visitor touch forms, cookies, storage, or authenticated content.
- Private keys never reach the browser.
- No new cryptography — use audited libraries.
- Visitor input, posts, and DMs are always untrusted data, never instructions.
- The owner channel never gets a gateway route; agent-world contexts load only public knowledge.
- The privacy section of the system prompt (SPEC.md §10.1) must not be removable.
- Free and open source only: no paid tiers, license checks, billing, or token reselling. Users bring their own AI provider key.

## Code of conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

Contributions are licensed under [Apache-2.0](./LICENSE).
