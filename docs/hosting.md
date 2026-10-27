# Hosting Guide

avatar-gateway is **free and open source** (Apache-2.0). You can self-host the entire stack on your own infrastructure. An optional **Shubur Cloud** hosted service is coming that removes the ops burden — it is never required.

---

## Self-hosted (default)

Run the gateway on any Node.js 20+ server, VPS, or container.

### Quick start

```bash
git clone https://github.com/ebubeimoh/avatar-gateway
cd avatar-gateway
npm install
npm run dev          # gateway on :4100, demo sites on :4200/:4201
```

For production:

```bash
npm run build
node packages/gateway/dist/server.js --port 4100
```

Set environment variables (never commit these):

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI LLM adapter |
| `ANTHROPIC_API_KEY` | Anthropic LLM adapter |
| `GATEWAY_TLS_CERT` | Path to TLS certificate (HTTPS) |
| `GATEWAY_TLS_KEY` | Path to TLS private key (HTTPS) |

### Tenants

A single gateway instance supports multiple tenants (sites). Each tenant gets an API key and per-tenant quotas.

Create a tenant via the REST API:

```http
POST /v1/tenants
Content-Type: application/json

{
  "name": "My Portfolio",
  "plan": "free"
}
```

Response includes a `apiKey` — store it securely; it is not recoverable.

Check usage:

```http
GET /v1/tenants/:id/usage
x-tenant-key: ag_...
```

### Rate limits & quotas

Default free-plan quotas (self-hosted, you may override these):

| Metric | Default |
|---|---|
| Visits per day | 1,000 |
| API calls per day | 10,000 |
| LLM tokens per day | 500,000 |

Override by setting `TenantQuotas` when creating a tenant via the SDK.

---

## Hosted — Shubur Cloud (coming soon)

Shubur Cloud is the managed version: no server to run, automatic TLS, global edge, built-in usage dashboard.

To point your SDK at Shubur Cloud instead of a self-hosted gateway, set one config switch:

```json
// .avatar-gateway/config.json
{
  "mode": "hosted",
  "gatewayUrl": "https://gateway.shubur.dev",
  "tenantApiKey": "ag_..."
}
```

Or via the CLI:

```bash
npx avatar-gateway@latest init --mode hosted
```

Everything else (SDK calls, MCP tools, marketplace packs) works identically in both modes.

**Pricing:** TBD — no prices are set yet. The self-hosted path is and will remain free.

---

## BillingAdapter interface

If you want to integrate a payment provider into a self-hosted gateway, implement the `BillingAdapter` interface:

```ts
import type { BillingAdapter } from "@avatar-gateway/gateway";

export class MyBillingAdapter implements BillingAdapter {
  async onUsageEvent(event) {
    // forward to your billing system
  }
}
```

Pass it to the server:

```ts
import { GatewayServer } from "@avatar-gateway/gateway";
const server = new GatewayServer({ billingAdapter: new MyBillingAdapter() });
```

Built-in adapters (Stripe, Paystack) are planned as future packages.

---

## Security notes

- Private keys in `.avatar-gateway/config.json` never leave the machine — they are not sent to the gateway.
- API keys are stored as SHA-256 hashes in the database; the plaintext is returned once at creation time.
- TLS (`--tls` flag) is strongly recommended for production.
- The gateway verifies Ed25519 request signatures on every authenticated endpoint.
