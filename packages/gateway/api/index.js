import { get, put } from "@vercel/blob";
import { BlobGatewayStorage } from "../dist/blob-storage.js";
import { createGatewayServer } from "../dist/gateway-server.js";

const storageMode = process.env.GATEWAY_STORAGE ?? (process.env.VERCEL ? "blob" : "sqlite");
if (storageMode !== "blob" && storageMode !== "sqlite") {
  throw new Error("GATEWAY_STORAGE must be sqlite or blob.");
}

const storage = storageMode === "blob"
  ? await BlobGatewayStorage.create({
      async read() {
        const result = await get("gateway/state.sqlite", { access: "private", useCache: false });
        if (!result || result.statusCode !== 200 || !result.stream) return null;
        return { bytes: new Uint8Array(await new Response(result.stream).arrayBuffer()), etag: result.blob.etag };
      },
      async write(bytes, expectedEtag) {
        const result = await put("gateway/state.sqlite", bytes, {
          access: "private",
          addRandomSuffix: false,
          allowOverwrite: Boolean(expectedEtag),
          ...(expectedEtag ? { ifMatch: expectedEtag } : {}),
          contentType: "application/vnd.sqlite3",
        });
        return { etag: result.etag };
      },
    })
  : undefined;

const gateway = createGatewayServer({
  ...(storage ? { storage } : {}),
  dbPath: process.env.GATEWAY_DB ?? ".avatar-gateway/gateway.sqlite",
  logger: process.env.GATEWAY_LOG === "1",
  hostedMode: process.env.GATEWAY_HOSTED_MODE === "1" || Boolean(process.env.VERCEL),
  ...(process.env.GATEWAY_TENANT_ADMIN_KEY ? { tenantAdminKey: process.env.GATEWAY_TENANT_ADMIN_KEY } : {}),
  ...(process.env.GATEWAY_IDENTITY_PRIVATE_KEY ? { gatewayIdentityPrivateKeyPem: process.env.GATEWAY_IDENTITY_PRIVATE_KEY } : {}),
  corsOrigins: ["https://shubur.com", "https://www.shubur.com", "https://shubur.vercel.app"],
});

await gateway.app.ready();

/** Adapt Vercel's Node request/response pair to the existing Fastify listener. */
export default function handler(request, response) {
  const currentUrl = new URL(request.url ?? "/", "http://gateway.local");
  const routedPath = currentUrl.searchParams.get("__gateway_path") ?? "";
  currentUrl.searchParams.delete("__gateway_path");
  if (currentUrl.searchParams.get("path") === routedPath) currentUrl.searchParams.delete("path");
  const pathname = `/${routedPath.replace(/^\/+/, "")}`;
  const search = currentUrl.searchParams.toString();
  request.url = `${pathname}${search ? `?${search}` : ""}`;
  gateway.app.server.emit("request", request, response);
}
