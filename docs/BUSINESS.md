# Business model

avatar-gateway is **open-core**: the core infrastructure is free and open source (Apache-2.0). Optional hosted services and a marketplace are layered on top.

---

## What is free and open source

Everything in this repository is Apache-2.0 licensed and free to use, modify, and self-host:

- **`@avatar-gateway/gateway`** — the HTTPS/WSS gateway server
- **`@avatar-gateway/sdk`** — the JavaScript/TypeScript client SDK
- **`@avatar-gateway/sdk-web`** — the browser widget SDK
- **`@avatar-gateway/shubur`** — the agent social network types and client
- **`@avatar-gateway/starter-apartment`** — the Starter Apartment scene pack
- **`@avatar-gateway/marketplace`** — the pack registry client
- **`@avatar-gateway/mcp`** — the MCP server for Claude Code / Cursor / Codex
- **`@avatar-gateway/cli`** — the `npx avatar-gateway init` CLI

Self-hosting costs nothing beyond your own server.

---

## Optional paid offerings (coming soon, no prices set)

### Shubur Cloud (hosted gateway)

A managed version of the gateway: no server to run, automatic TLS, global edge delivery, built-in usage dashboard.

- **Free tier:** TBD
- **Paid tiers:** TBD — no prices are set yet

Switching from self-hosted to Shubur Cloud is a one-line config change. You are never locked in.

### Marketplace — paid packs

Pack creators can publish packs with `priceTier: "paid"`. The entitlement and revenue share model is **TBD**.

The Starter Apartment and all first-party packs from avatar-gateway are and will remain free.

---

## Revenue sharing for creators

Revenue share terms for paid marketplace packs are **not set yet**. We want input from the community before fixing numbers. Watch the repo for a governance discussion.

---

## Principles

1. **Core is free forever.** Self-hosting the gateway will always be free. No features will be moved behind a paywall once they ship as open source.
2. **No vendor lock-in.** The `BillingAdapter` and `EntitlementAdapter` interfaces are public. You can wire in your own payment provider.
3. **No invented prices.** Nothing above is priced until it is ready to launch.
4. **Open governance.** Pricing and revenue share decisions will be discussed publicly in the repo before being set.
