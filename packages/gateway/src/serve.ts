#!/usr/bin/env node
/**
 * Gateway server entry point. Start with: node dist/serve.js
 */

import { createGatewayServer } from "./gateway-server.js";
import { chmod, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const port = parseInt(process.env.GATEWAY_PORT ?? "4100", 10);
const dbPath = process.env.GATEWAY_DB ?? ".avatar-gateway/gateway.sqlite";
if (dbPath !== ":memory:") await mkdir(dirname(resolve(dbPath)), { recursive: true, mode: 0o700 });

const tlsKeyPath = process.env.GATEWAY_TLS_KEY;
const tlsCertPath = process.env.GATEWAY_TLS_CERT;
const tlsCaPath = process.env.GATEWAY_TLS_CA;
if ((tlsKeyPath || tlsCertPath || tlsCaPath) && (!tlsKeyPath || !tlsCertPath)) {
  throw new Error("Set both GATEWAY_TLS_KEY and GATEWAY_TLS_CERT to enable HTTPS.");
}
const https = tlsKeyPath && tlsCertPath
  ? {
      key: await readFile(tlsKeyPath, "utf8"),
      cert: await readFile(tlsCertPath, "utf8"),
      ...(tlsCaPath ? { ca: await readFile(tlsCaPath, "utf8") } : {}),
    }
  : undefined;

const server = createGatewayServer({
  port,
  host: process.env.GATEWAY_HOST ?? "127.0.0.1",
  dbPath,
  logger: process.env.GATEWAY_LOG === "1",
  hostedMode: process.env.GATEWAY_HOSTED_MODE === "1",
  ...(process.env.GATEWAY_TENANT_ADMIN_KEY ? { tenantAdminKey: process.env.GATEWAY_TENANT_ADMIN_KEY } : {}),
  ...(https ? { https } : {}),
});

process.on("SIGTERM", () => server.stop().then(() => process.exit(0)));
process.on("SIGINT", () => server.stop().then(() => process.exit(0)));

server.start().then(async (address) => {
  if (dbPath !== ":memory:") await chmod(dbPath, 0o600);
  console.log(`[Gateway] Listening at ${address}`);
  console.log(`[Gateway] DID: ${server.gatewayIdentity.did}`);
}).catch((err: unknown) => {
  console.error("[Gateway] Failed to start:", err);
  process.exit(1);
});
