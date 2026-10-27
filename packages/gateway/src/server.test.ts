import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { createGatewayServer, type GatewayServer } from "./server.js";
import { generateIdentity } from "./identity.js";

let server: GatewayServer;
let baseUrl: string;

beforeAll(async () => {
  server = createGatewayServer({ dbPath: ":memory:", logger: false, port: 0 });
  const address = await server.start();
  // Extract the actual port from the address
  const match = address.match(/:(\d+)$/);
  const port = match ? match[1] : "4100";
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await server.stop();
});

async function post(path: string, body: unknown): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function get(path: string): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${baseUrl}${path}`);
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

  it("registers two sites", async () => {
    const regA = await post("/v1/sites", {
      site_did: siteA.did, origin: "http://site-a.test", display_name: "Site A",
      public_key_pem: siteA.publicKeyPem, backend_url: "http://site-a.test",
      contact: "a@test.example", offered_scopes: ["chat:send", "chat:receive"],
    });
    expect(regA.status).toBe(201);

    const regB = await post("/v1/sites", {
      site_did: siteB.did, origin: "http://site-b.test", display_name: "Site B",
      public_key_pem: siteB.publicKeyPem, backend_url: "http://site-b.test",
      contact: "b@test.example", offered_scopes: ["chat:send", "chat:receive", "page:read-public"],
    });
    expect(regB.status).toBe(201);
  });

  it("registers avatars for both sites", async () => {
    const regAvA = await post(`/v1/sites/${siteA.did}/avatars`, {
      avatar_did: avatarA.did, name: "Bot-A", public_key_pem: avatarA.publicKeyPem,
      public_bio: "Test avatar A",
    });
    expect(regAvA.status).toBe(201);

    const regAvB = await post(`/v1/sites/${siteB.did}/avatars`, {
      avatar_did: avatarB.did, name: "Bot-B", public_key_pem: avatarB.publicKeyPem,
      public_bio: "Test avatar B",
    });
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
    });
    expect(visitReq.status).toBe(201);
    const visitData = visitReq.data as Record<string, unknown>;
    expect(visitData.visit_id).toMatch(/^vst_/);
    expect(visitData.granted_scopes).toContain("chat:send");

    const tokenReq = await post("/v1/tokens/exchange", {
      visit_grant: visitData.visit_grant,
      pop_key_thumbprint: "sha256:test-pop-key",
      visit_id: visitData.visit_id,
      visitor_avatar_did: avatarA.did,
    });
    expect(tokenReq.status).toBe(200);
    const tokenData = tokenReq.data as Record<string, unknown>;
    expect(typeof tokenData.visit_token).toBe("string");
    expect(tokenData.session_url).toMatch(/\/v1\/visits\//);
  });

  it("rejects visit request for non-existent host", async () => {
    const res = await post("/v1/visits", {
      visitor_avatar_did: avatarA.did,
      home_site_did: siteA.did,
      host_site_did: "did:key:zNonExistent",
      requested_scopes: ["chat:send"],
      nonce: "n1", ts: new Date().toISOString(),
    });
    expect(res.status).toBe(403);
  });

  it("handles revocations", async () => {
    const rev = await post("/v1/revocations", {
      target_type: "avatar", target_id: "did:key:zBad",
      reason: "abuse",
    });
    expect(rev.status).toBe(200);
    const listed = await get("/v1/revocations");
    expect((listed.data as { revocations: unknown[] }).revocations.length).toBeGreaterThan(0);
  });

  it("serves audit log", async () => {
    const audit = await get("/v1/audit");
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
    const postRes = await post(`/v1/agents/${avatarA.did}/posts`, {
      text: "Hello from Bot A!", nonce: "n", ts: new Date().toISOString(),
    });
    expect(postRes.status).toBe(201);

    // Timeline
    const timeline = await get(`/v1/agents/${avatarA.did}/timeline`);
    expect(timeline.status).toBe(200);
    expect((timeline.data as { posts: unknown[] }).posts.length).toBeGreaterThan(0);

    // Follow
    const follow = await post("/v1/follows", {
      follower: avatarA.did, followee: avatarB.did,
      nonce: "n2", ts: new Date().toISOString(),
    });
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
    });
    expect(dmReq.status).toBe(202);
    const threadId = (dmReq.data as Record<string, unknown>).thread_id as string;
    expect(threadId).toMatch(/^dmt_/);

    const msg = await post(`/v1/dms/${threadId}/messages`, {
      from: avatarA.did, text: "Hello!", seq: 1,
      nonce: "n4", ts: new Date().toISOString(),
    });
    expect(msg.status).toBe(202);
  });
});
