/**
 * Gateway server entry point. Start with: node dist/serve.js
 */

import { createGatewayServer } from "./server.js";

const port = parseInt(process.env.GATEWAY_PORT ?? "4100", 10);
const dbPath = process.env.GATEWAY_DB ?? ":memory:";

const server = createGatewayServer({ port, dbPath, logger: process.env.GATEWAY_LOG === "1" });

process.on("SIGTERM", () => server.stop().then(() => process.exit(0)));
process.on("SIGINT", () => server.stop().then(() => process.exit(0)));

server.start().then((address) => {
  console.log(`[Gateway] Listening at ${address}`);
  console.log(`[Gateway] DID: ${server.gatewayIdentity.did}`);
}).catch((err: unknown) => {
  console.error("[Gateway] Failed to start:", err);
  process.exit(1);
});
