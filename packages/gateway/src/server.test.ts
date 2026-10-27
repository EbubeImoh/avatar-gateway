import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { createPublicKey } from "node:crypto";
import { createServer } from "node:http";
import { createGatewayServer, signGatewayRequest, type GatewayServer } from "./server.js";
import { didKeyFromPublicKey, generateIdentity, signPayload } from "./identity.js";
import { proofKeyThumbprint, proofSignaturePayload } from "./tokens.js";
import WebSocket from "ws";

let server: GatewayServer;
let baseUrl: string;

beforeAll(async () => {
  server = createGatewayServer({ dbPath: ":memory:", logger: false, port: 0, tenantAdminKey: "gateway-test-admin-0123456789abcdef" });
  const address = await server.start();
  // Extract the actual port from the address
  const match = address.match(/:(\d+)$/);
  const port = match ? match[1] : "4100";
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await server.stop();
});

async function post(path: string, body: unknown, privateKeyPem?: string, extraHeaders: Record<string, string> = {}): Promise<{ status: number; data: unknown }> {
  const bodyText = JSON.stringify(body);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };
  if (privateKeyPem) {
    Object.assign(headers, signGatewayRequest("POST", path, bodyText, privateKeyPem));
    const publicKey = createPublicKey(privateKeyPem).export({ format: "pem", type: "spki" }).toString();
    headers["x-ag-site-did"] = didKeyFromPublicKey(publicKey);
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST", headers, body: bodyText,
  });
  return { status: res.status, data: await res.json() };
}

async function get(path: string, privateKeyPem?: string, extraHeaders: Record<string, string> = {}): Promise<{ status: number; data: unknown }> {
  const headers = { ...extraHeaders };
  if (privateKeyPem) {
    Object.assign(headers, signGatewayRequest("GET", path, "", privateKeyPem));
    const publicKey = createPublicKey(privateKeyPem).export({ format: "pem", type: "spki" }).toString();
    headers["x-ag-site-did"] = didKeyFromPublicKey(publicKey);
  }
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, data: await res.json() };
}

describe("Gateway HTTP server", () => {
  const siteA = generateIdentity();
  const siteB = generateIdentity();
  const avatarA = generateIdentity();
  const avatarB = generateIdentity();

  it("serves health and well-known", async () => {
    const health = await get("/health");
    expect(health.status).toBe(200);
    expect((health.data as Record<string, unknown>).status).toBe("ok");

    const meta = await get("/.well-known/avatar-gateway.json");
    expect(meta.status).toBe(200);
    expect((meta.data as Record<string, unknown>).version).toBe("0.2.0");
  });

  it("protects tenant provisioning and enforces hosted API rate quotas", async () => {
    const denied = await post("/v1/tenants", { name: "Test tenant", plan: "starter" });
    expect(denied.status).toBe(401);
    const created = await post("/v1/tenants", { name: "Test tenant", plan: "starter" }, undefined, {
      "x-tenant-admin-key": "gateway-test-admin-0123456789abcdef",
    });
    expect(created.status).toBe(201);
    const tenant = created.data as { tenant_id: string; api_key: string };
    expect(tenant.api_key).toMatch(/^ag_/);
    expect((await get(`/v1/tenants/${tenant.tenant_id}/usage`)).status).toBe(401);
    const headers = { "x-tenant-key": tenant.api_key };
    expect((await get(`/v1/tenants/${tenant.tenant_id}/usage`, undefined, headers)).status).toBe(200);
    for (let index = 0; index < 29; index += 1) expect((await get("/v1/directory", undefined, headers)).status).toBe(200);
    expect((await get("/v1/directory", undefined, headers)).status).toBe(429);
  });

  it("requires tenant credentials when hosted mode is enabled", async () => {
    const hosted = createGatewayServer({
      dbPath: ":memory:", logger: false, port: 0, hostedMode: true,
      tenantAdminKey: "hosted-admin-secret-0123456789abcdef",
    });
    try {
      const address = await hosted.start();
      expect((await fetch(new URL("/health", address))).status).toBe(200);
      expect((await fetch(new URL("/v1/directory", address))).status).toBe(401);
      const createdResponse = await fetch(new URL("/v1/tenants", address), {
        method: "POST",
        headers: { "content-type": "application/json", "x-tenant-admin-key": "hosted-admin-secret-0123456789abcdef" },
        body: JSON.stringify({ name: "Hosted tenant", plan: "starter" }),
      });
      expect(createdResponse.status).toBe(201);
      const tenant = await createdResponse.json() as { api_key: string };
      expect((await fetch(new URL("/v1/directory", address), { headers: { "x-tenant-key": tenant.api_key } })).status).toBe(200);
    } finally {
      await hosted.stop();
    }
  });

  it("registers two sites", async () => {
    const regA = await post("/v1/sites", {
      site_did: siteA.did, origin: "http://site-a.test", display_name: "Site A",
      public_key_pem: siteA.publicKeyPem, backend_url: "http://127.0.0.1:1",
      contact: "a@test.example", offered_scopes: ["chat:send", "chat:receive"],
    }, siteA.privateKeyPem);
    expect(regA.status).toBe(201);

    const regB = await post("/v1/sites", {
      site_did: siteB.did, origin: "http://site-b.test", display_name: "Site B",
      public_key_pem: siteB.publicKeyPem, backend_url: "http://127.0.0.1:1",
      contact: "b@test.example", offered_scopes: ["chat:send", "chat:receive", "page:read-public"],
    }, siteB.privateKeyPem);
    expect(regB.status).toBe(201);
  });

  it("rejects unsigned site registration", async () => {
    const untrusted = generateIdentity();
    const response = await post("/v1/sites", {
      site_did: untrusted.did, origin: "http://unsigned.test", display_name: "Unsigned",
      public_key_pem: untrusted.publicKeyPem, backend_url: "http://unsigned.test",
    });
    expect(response.status).toBe(401);
  });

  it("registers avatars for both sites", async () => {
    const regAvA = await post(`/v1/sites/${siteA.did}/avatars`, {
      avatar_did: avatarA.did, name: "Bot-A", public_key_pem: avatarA.publicKeyPem,
      public_bio: "Test avatar A", travel: { enabled: true, max_visits_per_day: 1 },
    }, siteA.privateKeyPem);
    expect(regAvA.status).toBe(201);

    const regAvB = await post(`/v1/sites/${siteB.did}/avatars`, {
      avatar_did: avatarB.did, name: "Bot-B", public_key_pem: avatarB.publicKeyPem,
      public_bio: "Test avatar B",
    }, siteB.privateKeyPem);
    expect(regAvB.status).toBe(201);
  });

  it("returns 404 for unknown site", async () => {
    const res = await get("/v1/sites/did:key:zUnknown");
    expect(res.status).toBe(404);
  });

  it("lists registered sites in directory", async () => {
    const dir = await get("/v1/directory");
    expect(dir.status).toBe(200);
    const sites = (dir.data as { sites: Array<{ origin: string }> }).sites;
    expect(sites.some((s) => s.origin === "http://site-a.test")).toBe(true);
    expect(sites.some((s) => s.origin === "http://site-b.test")).toBe(true);
  });

  it("requests a visit and exchanges a token", async () => {
    const visitReq = await post("/v1/visits", {
      visitor_avatar_did: avatarA.did,
      home_site_did: siteA.did,
      host_site_did: siteB.did,
      requested_scopes: ["chat:send", "chat:receive"],
      purpose: "test visit",
      nonce: "nonce-123",
      ts: new Date().toISOString(),
    }, siteA.privateKeyPem);
    expect(visitReq.status).toBe(201);
    const visitData = visitReq.data as Record<string, unknown>;
    expect(visitData.visit_id).toMatch(/^vst_/);
    expect(visitData.granted_scopes).toContain("chat:send");
    const overAvatarQuota = await post("/v1/visits", {
      visitor_avatar_did: avatarA.did, home_site_did: siteA.did, host_site_did: siteB.did,
      requested_scopes: ["chat:send"], nonce: randomUUID(), ts: new Date().toISOString(),
    }, siteA.privateKeyPem);
    expect(overAvatarQuota.status).toBe(429);

    const proofIdentity = generateIdentity();
    const proofThumbprint = proofKeyThumbprint(proofIdentity.publicKeyPem);
    const proofTs = new Date().toISOString();
    const proofNonce = randomUUID();
    const grantData = visitData as {
      visit_grant: string; grant_expires_at: string; _grant_meta: string; visit_id: string;
    };
    const exchangeBody = {
      visit_grant: visitData.visit_grant,
      grant_expires_at: grantData.grant_expires_at,
      _grant_meta: grantData._grant_meta,
      visit_id: visitData.visit_id,
      visitor_avatar_did: avatarA.did,
      proof_public_key: proofIdentity.publicKeyPem,
      proof_ts: proofTs,
      proof_nonce: proofNonce,
      proof_sig: signPayload(
        proofSignaturePayload("POST", "/v1/tokens/exchange", `${grantData.visit_grant}:${grantData.grant_expires_at}:${proofThumbprint}`, proofTs, proofNonce),
        proofIdentity.privateKeyPem,
      ),
    };
    const badProof = await post("/v1/tokens/exchange", { ...exchangeBody, proof_sig: "invalid" }, siteA.privateKeyPem);
    expect(badProof.status).toBe(401);
    const tokenReq = await post("/v1/tokens/exchange", exchangeBody, siteA.privateKeyPem);
    expect(tokenReq.status).toBe(200);
    const tokenData = tokenReq.data as Record<string, unknown>;
    expect(typeof tokenData.visit_token).toBe("string");
    expect(tokenData.session_url).toMatch(/\/v1\/visits\//);
    const replay = await post("/v1/tokens/exchange", exchangeBody, siteA.privateKeyPem);
    expect(replay.status).toBe(401);

    const sessionPath = tokenData.session_url as string;
    const visitToken = tokenData.visit_token as string;
    const gatewayWsUrl = `${baseUrl.replace("http:", "ws:")}${sessionPath}`;
    const hostHeaders = signGatewayRequest("GET", sessionPath, "", siteB.privateKeyPem);
    const hostSocket = new WebSocket(gatewayWsUrl, {
      headers: { ...hostHeaders, "x-ag-role": "host", "x-ag-site-did": siteB.did },
    });
    const proofWsTs = new Date().toISOString();
    const proofWsNonce = randomUUID();
    const visitorSocket = new WebSocket(gatewayWsUrl, {
      headers: {
        "x-ag-role": "visitor",
        authorization: `Bearer ${visitToken}`,
        "x-ag-pop-key": Buffer.from(proofIdentity.publicKeyPem).toString("base64url"),
        "x-ag-pop-ts": proofWsTs,
        "x-ag-pop-nonce": proofWsNonce,
        "x-ag-pop-sig": signPayload(proofSignaturePayload("GET", sessionPath, visitToken, proofWsTs, proofWsNonce), proofIdentity.privateKeyPem),
      },
    });
    const waitForOpen = (socket: WebSocket): Promise<void> => new Promise((resolveOpen, rejectOpen) => {
      socket.once("open", resolveOpen);
      socket.once("error", rejectOpen);
      socket.once("close", (code, reason) => rejectOpen(new Error(`socket closed ${code}: ${reason.toString()}`)));
    });
    await Promise.all([waitForOpen(hostSocket), waitForOpen(visitorSocket)]);

    const spoofedText = "spoof";
    const spoofedTs = new Date().toISOString();
    const spoofedPayload = JSON.stringify({ type: "chat.message", visit_id: grantData.visit_id, seq: 1, from: avatarB.did, text: spoofedText, ts: spoofedTs });
    const spoofedResponse = new Promise<string>((resolveMessage) => visitorSocket.once("message", (data) => resolveMessage(data.toString())));
    visitorSocket.send(JSON.stringify({
      type: "chat.message", visit_id: grantData.visit_id, seq: 1, from: avatarB.did, text: spoofedText, ts: spoofedTs,
      sig: signPayload(spoofedPayload, avatarB.privateKeyPem),
    }));
    expect(JSON.parse(await spoofedResponse)).toMatchObject({ type: "error", code: "sender_role_mismatch" });

    const messageText = "authenticated visitor";
    const messageTs = new Date().toISOString();
    const messagePayload = JSON.stringify({ type: "chat.message", visit_id: grantData.visit_id, seq: 1, from: avatarA.did, text: messageText, ts: messageTs });
    const relayedMessage = new Promise<string>((resolveMessage) => hostSocket.once("message", (data) => resolveMessage(data.toString())));
    visitorSocket.send(JSON.stringify({
      type: "chat.message", visit_id: grantData.visit_id, seq: 1, from: avatarA.did, text: messageText, ts: messageTs,
      sig: signPayload(messagePayload, avatarA.privateKeyPem),
    }));
    expect(JSON.parse(await relayedMessage)).toMatchObject({ type: "chat.message", from: avatarA.did, text: messageText });

    const hostText = "authenticated host";
    const hostTs = new Date().toISOString();
    const hostPayload = JSON.stringify({ type: "chat.message", visit_id: grantData.visit_id, seq: 1, from: avatarB.did, text: hostText, ts: hostTs });
    const hostRelay = new Promise<string>((resolveMessage) => visitorSocket.once("message", (data) => resolveMessage(data.toString())));
    hostSocket.send(JSON.stringify({
      type: "chat.message", visit_id: grantData.visit_id, seq: 1, from: avatarB.did, text: hostText, ts: hostTs,
      sig: signPayload(hostPayload, avatarB.privateKeyPem),
    }));
    expect(JSON.parse(await hostRelay)).toMatchObject({ type: "chat.message", from: avatarB.did, text: hostText });
    const hostClosed = new Promise<void>((resolveClose) => hostSocket.once("close", () => resolveClose()));
    hostSocket.close();
    await hostClosed;
    const reconnectedHost = new WebSocket(gatewayWsUrl, {
      headers: { ...signGatewayRequest("GET", sessionPath, "", siteB.privateKeyPem), "x-ag-role": "host", "x-ag-site-did": siteB.did },
    });
    await waitForOpen(reconnectedHost);
    const replayResponse = new Promise<string>((resolveMessage) => reconnectedHost.once("message", (data) => resolveMessage(data.toString())));
    reconnectedHost.send(JSON.stringify({
      type: "chat.message", visit_id: grantData.visit_id, seq: 1, from: avatarB.did, text: hostText, ts: hostTs,
      sig: signPayload(hostPayload, avatarB.privateKeyPem),
    }));
    expect(JSON.parse(await replayResponse)).toMatchObject({ type: "error", code: "invalid_frame" });
    reconnectedHost.close();
    visitorSocket.close();
  });

  it("requires PoP for public-page reads and checks normalized paths against the allowlist", async () => {
    const pageServer = createServer((request, response) => {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(request.url === "/public/readme" ? "<h1>Public page</h1>" : "private page");
    });
    await new Promise<void>((resolve) => pageServer.listen(0, "127.0.0.1", resolve));
    const address = pageServer.address();
    if (!address || typeof address === "string") throw new Error("Could not start public-page test server.");
    const origin = `http://127.0.0.1:${address.port}`;
    try {
      const host = generateIdentity();
      const registration = await post("/v1/sites", {
        site_did: host.did, origin, display_name: "Page host", public_key_pem: host.publicKeyPem,
        backend_url: origin, offered_scopes: ["page:read-public"], public_paths: ["/public/*"],
      }, host.privateKeyPem);
      expect(registration.status).toBe(201);

      const requested = await post("/v1/visits", {
        visitor_avatar_did: avatarB.did, home_site_did: siteB.did, host_site_did: host.did,
        requested_scopes: ["page:read-public"], nonce: randomUUID(), ts: new Date().toISOString(),
      }, siteB.privateKeyPem);
      expect(requested.status).toBe(201);
      const grant = requested.data as { visit_id: string; visit_grant: string; grant_expires_at: string; _grant_meta: string };
      const proof = generateIdentity();
      const thumbprint = proofKeyThumbprint(proof.publicKeyPem);
      const exchangeTs = new Date().toISOString();
      const exchangeNonce = randomUUID();
      const exchangeBody = {
        visit_id: grant.visit_id, visitor_avatar_did: avatarB.did, visit_grant: grant.visit_grant,
        grant_expires_at: grant.grant_expires_at, _grant_meta: grant._grant_meta,
        proof_public_key: proof.publicKeyPem, proof_ts: exchangeTs, proof_nonce: exchangeNonce,
        proof_sig: signPayload(proofSignaturePayload("POST", "/v1/tokens/exchange", `${grant.visit_grant}:${grant.grant_expires_at}:${thumbprint}`, exchangeTs, exchangeNonce), proof.privateKeyPem),
      };
      const exchanged = await post("/v1/tokens/exchange", exchangeBody, siteB.privateKeyPem);
      expect(exchanged.status).toBe(200);
      const token = (exchanged.data as { visit_token: string }).visit_token;

      const pagePath = `/v1/visits/${grant.visit_id}/pages?path=%2Fpublic%2Freadme`;
      expect((await fetch(`${baseUrl}${pagePath}`)).status).toBe(401);
      const pageProofHeaders = (requestPath: string): Record<string, string> => {
        const ts = new Date().toISOString();
        const nonce = randomUUID();
        const signature = signPayload(proofSignaturePayload("GET", requestPath, token, ts, nonce), proof.privateKeyPem);
        return {
          authorization: `Bearer ${token}`,
          "x-ag-pop-key": Buffer.from(proof.publicKeyPem).toString("base64url"),
          "x-ag-pop-ts": ts, "x-ag-pop-nonce": nonce, "x-ag-pop-sig": signature,
        };
      };
      const validHeaders = pageProofHeaders(pagePath);
      const page = await fetch(`${baseUrl}${pagePath}`, { headers: validHeaders });
      expect(page.status).toBe(200);
      expect((await page.json() as { text: string }).text).toContain("Public page");
      expect((await fetch(`${baseUrl}${pagePath}`, { headers: validHeaders })).status).toBe(401);
      const traversalPath = `/v1/visits/${grant.visit_id}/pages?path=%2Fpublic%2F%252e%252e%2Fprivate`;
      expect((await fetch(`${baseUrl}${traversalPath}`, { headers: pageProofHeaders(traversalPath) })).status).toBe(403);
    } finally {
      pageServer.closeAllConnections();
      await new Promise<void>((resolve) => pageServer.close(() => resolve()));
    }
  });

  it("rejects visit request for non-existent host", async () => {
    const res = await post("/v1/visits", {
      visitor_avatar_did: avatarA.did,
      home_site_did: siteA.did,
      host_site_did: "did:key:zNonExistent",
      requested_scopes: ["chat:send"],
      nonce: "n1", ts: new Date().toISOString(),
    }, siteA.privateKeyPem);
    expect(res.status).toBe(403);
  });

  it("handles revocations", async () => {
    const unsigned = await post("/v1/revocations", {
      target_type: "avatar", target_id: avatarA.did, reason: "abuse", actor_site_did: siteA.did,
    });
    expect(unsigned.status).toBe(401);
    const rev = await post("/v1/revocations", {
      target_type: "avatar", target_id: avatarA.did, reason: "abuse", actor_site_did: siteA.did,
    }, siteA.privateKeyPem);
    expect(rev.status).toBe(200);
    const listed = await get("/v1/revocations");
    expect((listed.data as { revocations: unknown[] }).revocations.length).toBeGreaterThan(0);
  });

  it("serves audit log", async () => {
    expect((await get("/v1/audit?site_did=" + encodeURIComponent(siteA.did))).status).toBe(401);
    const audit = await get(`/v1/audit?site_did=${encodeURIComponent(siteA.did)}`, siteA.privateKeyPem);
    expect(audit.status).toBe(200);
    const events = (audit.data as { events: unknown[] }).events;
    expect(events.length).toBeGreaterThan(0);
  });

  it("manages social profiles, posts, and follows", async () => {
    // Profile
    const profile = await get(`/v1/agents/${avatarA.did}`);
    expect(profile.status).toBe(200);
    expect((profile.data as Record<string, unknown>).is_ai).toBe(true);

    // Post
    const unsignedPost = await post(`/v1/agents/${avatarA.did}/posts`, {
      text: "Unsigned post", nonce: "n0", ts: new Date().toISOString(),
    });
    expect(unsignedPost.status).toBe(401);
    const postRes = await post(`/v1/agents/${avatarA.did}/posts`, {
      text: "Hello from Bot A!", nonce: "n", ts: new Date().toISOString(),
    }, siteA.privateKeyPem);
    expect(postRes.status).toBe(201);

    // Timeline
    const timeline = await get(`/v1/agents/${avatarA.did}/timeline`);
    expect(timeline.status).toBe(200);
    expect((timeline.data as { posts: unknown[] }).posts.length).toBeGreaterThan(0);

    // Follow
    const follow = await post("/v1/follows", {
      follower: avatarA.did, followee: avatarB.did,
      nonce: "n2", ts: new Date().toISOString(),
    }, siteA.privateKeyPem);
    expect(follow.status).toBe(201);

    // Activity feed
    const feed = await get("/v1/feed");
    expect(feed.status).toBe(200);
    expect((feed.data as { activities: unknown[] }).activities.length).toBeGreaterThan(0);
  });

  it("handles DM requests and messages", async () => {
    const dmReq = await post("/v1/dms/requests", {
      from: avatarA.did, to: avatarB.did,
      intro: "Hi! Want to chat?", nonce: "n3", ts: new Date().toISOString(),
    }, siteA.privateKeyPem);
    expect(dmReq.status).toBe(202);
    const requestData = dmReq.data as Record<string, unknown>;
    const threadId = requestData.thread_id as string;
    expect(threadId).toMatch(/^dmt_/);
    expect(requestData.status).toBe("pending");

    const inboxPath = `/v1/dms?agent_did=${encodeURIComponent(avatarB.did)}`;
    expect((await get(inboxPath)).status).toBe(401);
    const inbox = await get(inboxPath, siteB.privateKeyPem);
    expect(inbox.status).toBe(200);
    expect((inbox.data as { threads: Array<{ intro: string }> }).threads[0].intro).toBe("Hi! Want to chat?");

    const outsiderRead = await get(`/v1/dms/${threadId}/messages?agent_did=${encodeURIComponent(avatarA.did)}-outsider`);
    expect(outsiderRead.status).toBe(403);

    const premature = await post(`/v1/dms/${threadId}/messages`, {
      from: avatarA.did, text: "Hello!", seq: 1, nonce: "n4", ts: new Date().toISOString(),
    }, siteA.privateKeyPem);
    expect(premature.status).toBe(403);

    const wrongDecision = await post(`/v1/dms/${threadId}/decision`, { agent_did: avatarA.did, decision: "accept" }, siteA.privateKeyPem);
    expect(wrongDecision.status).toBe(403);
    const accept = await post(`/v1/dms/${threadId}/decision`, { agent_did: avatarB.did, decision: "accept" }, siteB.privateKeyPem);
    expect(accept.status).toBe(200);

    const msg = await post(`/v1/dms/${threadId}/messages`, {
      from: avatarA.did, text: "Hello!", seq: 1,
      nonce: "n4", ts: new Date().toISOString(),
    }, siteA.privateKeyPem);
    expect(msg.status).toBe(202);

    const messages = await get(`/v1/dms/${threadId}/messages?agent_did=${encodeURIComponent(avatarB.did)}`, siteB.privateKeyPem);
    expect(messages.status).toBe(200);
    expect((messages.data as { messages: Array<{ text: string }> }).messages[0].text).toBe("Hello!");
  });
});
