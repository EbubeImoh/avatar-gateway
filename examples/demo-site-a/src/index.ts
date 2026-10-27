/**
 * Demo Site A — a portfolio site with an avatar that can visit Site B.
 *
 * Startup sequence:
 *   1. Generate Ed25519 keypair (site + avatar)
 *   2. Register with the gateway
 *   3. Serve HTTP on :4101
 *
 * After startup, POST /demo/visit to trigger a visit to Site B.
 */

import Fastify from "fastify";
import { generateIdentity, signPayload } from "@avatar-gateway/gateway";
import { AvatarRuntime, MockProvider } from "@avatar-gateway/avatar-runtime";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:4100";
const SITE_ORIGIN = process.env.SITE_A_ORIGIN ?? "http://localhost:4101";
const SITE_B_ORIGIN = process.env.SITE_B_ORIGIN ?? "http://localhost:4102";
const PORT = parseInt(process.env.SITE_A_PORT ?? "4101", 10);

// Generate keypairs
const siteIdentity = generateIdentity();
const avatarIdentity = generateIdentity();

// Avatar runtime
const runtime = new AvatarRuntime(
  {
    agentName: "Ebu-bot",
    ownerDisplayName: "Ebube Imoh",
    tone: "friendly, curious, technical",
    knowledge: [
      { id: "bio", visibility: "public", text: "AI/ML engineer based in Lagos, Nigeria. Builds LLM systems and agent tooling." },
      { id: "projects", visibility: "public", text: "Projects: avatar-gateway (you're talking to it!), various LLM experiments." },
      { id: "interests", visibility: "public", text: "Interested in AI safety, distributed systems, and open-source software." },
      { id: "phone", visibility: "private", text: "Phone: redacted (private)" },
    ],
  },
  new MockProvider(),
);

function signRequest(method: string, path: string, body: string): Record<string, string> {
  const ts = new Date().toISOString();
  const nonce = randomUUID();
  const sig = signPayload(`${method.toUpperCase()} ${path}\n${ts}\n${nonce}\n${body}`, siteIdentity.privateKeyPem);
  return { "Content-Type": "application/json", "x-ag-ts": ts, "x-ag-nonce": nonce, "x-ag-sig": sig };
}

async function gatewayPost(path: string, body: unknown): Promise<unknown> {
  const bodyStr = JSON.stringify(body);
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST", headers: signRequest("POST", path, bodyStr), body: bodyStr,
  });
  return res.json();
}

async function registerWithGateway(): Promise<void> {
  // Register site
  await gatewayPost("/v1/sites", {
    site_did: siteIdentity.did,
    origin: SITE_ORIGIN,
    display_name: "Demo Site A (Ebube)",
    public_key_pem: siteIdentity.publicKeyPem,
    backend_url: `${SITE_ORIGIN}`,
    contact: "hello@ebubeimoh.com",
    offered_scopes: ["chat:send", "chat:receive", "page:read-public", "presence:announce"],
    public_paths: ["/", "/about", "/projects", "/projects/*"],
  });
  console.log(`[Site A] Registered with gateway (DID: ${siteIdentity.did.slice(0, 30)}...)`);

  // Register avatar
  await gatewayPost(`/v1/sites/${siteIdentity.did}/avatars`, {
    avatar_did: avatarIdentity.did,
    name: "Ebu-bot",
    public_key_pem: avatarIdentity.publicKeyPem,
    public_bio: "AI/ML engineer avatar from Lagos.",
    look: { style: "brick-minifig", head: "smile", torso: "#1f6feb", legs: "#24292f", accessory: "headphones" },
    travel: { enabled: true, max_visits_per_day: 10 },
  });
  console.log(`[Site A] Avatar registered (DID: ${avatarIdentity.did.slice(0, 30)}...)`);
}

async function visitSiteB(): Promise<void> {
  console.log("[Site A] Starting visit to Site B...");

  // Request visit
  const visitResponse = await gatewayPost("/v1/visits", {
    visitor_avatar_did: avatarIdentity.did,
    home_site_did: siteIdentity.did,
    host_site_did: await getHostSiteDid(),
    requested_scopes: ["chat:send", "chat:receive", "page:read-public", "presence:announce"],
    purpose: "Say hi and learn about their projects",
    nonce: randomUUID(),
    ts: new Date().toISOString(),
  }) as { visit_id?: string; granted_scopes?: string[]; visit_grant?: string };

  if (!visitResponse.visit_id) {
    console.error("[Site A] Visit request failed:", visitResponse);
    return;
  }

  const visitId = visitResponse.visit_id;
  console.log(`[Site A] Visit ${visitId} granted with scopes: ${visitResponse.granted_scopes?.join(", ")}`);

  // Exchange for token
  const tokenResponse = await gatewayPost("/v1/tokens/exchange", {
    visit_grant: visitResponse.visit_grant,
    pop_key_thumbprint: `sha256:${avatarIdentity.did.slice(-16)}`,
    visit_id: visitId,
    visitor_avatar_did: avatarIdentity.did,
  }) as { visit_token?: string; session_url?: string };

  if (!tokenResponse.visit_token) {
    console.error("[Site A] Token exchange failed:", tokenResponse);
    return;
  }

  console.log(`[Site A] Visit token obtained. Connecting to relay...`);

  // Connect WebSocket
  const wsUrl = `ws://localhost:4100${tokenResponse.session_url}`;
  const ws = new WebSocket(wsUrl, { headers: { "x-ag-role": "visitor" } });

  let seq = 0;

  ws.on("open", async () => {
    console.log("[Site A] WebSocket connected. Starting chat...");

    // Send a few chat messages
    const messages = [
      "Hello! I'm Ebu-bot from Site A. What are you working on?",
      "That sounds interesting! What's your tech stack?",
      "Thanks for chatting! I'll head back now.",
    ];

    for (const text of messages) {
      seq++;
      const ts = new Date().toISOString();
      const payload = JSON.stringify({ type: "chat.message", visit_id: visitId, seq, from: avatarIdentity.did, text, ts });
      const sig = signPayload(payload, avatarIdentity.privateKeyPem);
      ws.send(JSON.stringify({ type: "chat.message", visit_id: visitId, seq, from: avatarIdentity.did, text, ts, sig }));
      console.log(`[Site A → Site B] Sent: "${text}"`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // End visit
    await gatewayPost(`/v1/visits/${visitId}/end`, { reason: "visitor_left" });
    console.log("[Site A] Visit ended. Closing connection.");
    ws.close();
  });

  ws.on("message", async (data) => {
    const msg = JSON.parse(data.toString()) as { type: string; text?: string; from?: string };
    if (msg.type === "chat.message") {
      console.log(`[Site B → Site A] Received: "${msg.text}"`);
      // Generate a reply using the runtime
      const reply = await runtime.agentChat(msg.text ?? "");
      console.log(`[Site A] Runtime reply: "${reply}"`);
    }
  });

  ws.on("error", (err) => console.error("[Site A] WebSocket error:", err.message));
  ws.on("close", () => console.log("[Site A] WebSocket closed."));
}

async function getHostSiteDid(): Promise<string> {
  // Get Site B's DID from the gateway directory
  const res = await fetch(`${GATEWAY_URL}/v1/directory`);
  const dir = await res.json() as { sites?: Array<{ origin: string; site_did: string }> };
  const siteB = dir.sites?.find((s) => s.origin === SITE_B_ORIGIN);
  if (!siteB) throw new Error(`Site B (${SITE_B_ORIGIN}) not found in gateway directory. Start Site B first.`);
  return siteB.site_did;
}

// HTTP server
const app = Fastify({ logger: false });

// Serve a simple portfolio page
app.get("/", async (_req, reply) => {
  reply.type("text/html").send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Demo Site A — Ebube Imoh</title>
<style>body{font-family:system-ui;max-width:700px;margin:2rem auto;padding:1rem;} .avatar-card{border:2px solid #172320;border-radius:17px;padding:1rem;max-width:300px;background:#fffef9;box-shadow:4px 4px 0 #172320;}</style>
</head>
<body>
<h1>Ebube Imoh — AI/ML Engineer</h1>
<p>Building LLM systems and agent tooling. This site has an avatar powered by avatar-gateway.</p>
<h2>Projects</h2><ul><li>avatar-gateway — free, open-source avatar network</li><li>Various LLM experiments</li></ul>
<h2>Avatar</h2>
<div class="avatar-card"><strong>Ebu-bot</strong><br><small>AI/ML engineer avatar from Lagos 🇳🇬</small></div>
<p><a href="/demo/visit">Trigger demo visit to Site B →</a></p>
</body></html>`);
});

app.get("/about", async (_req, reply) => {
  reply.send({ name: "Ebube Imoh", role: "AI/ML Engineer", location: "Lagos, Nigeria" });
});

app.get("/projects", async (_req, reply) => {
  reply.send({ projects: ["avatar-gateway", "llm-experiments"] });
});

// Visit hook — receives visit-offer from gateway
app.post<{ Body: { visit_id: string; visitor: { name: string; home_origin: string }; granted_scopes: string[] } }>(
  "/hooks/visit-offer",
  async (request, reply) => {
    const { visit_id, visitor } = request.body;
    console.log(`[Site A] Visit offer from ${visitor.name} (${visitor.home_origin}) for visit ${visit_id}`);
    // Auto-accept
    return reply.send({ decision: "accept", granted_scopes: request.body.granted_scopes, limits: { max_turns: 20 } });
  },
);

// Demo trigger endpoint
app.get("/demo/visit", async (_req, reply) => {
  visitSiteB().catch((err) => console.error("[Site A] Visit error:", err));
  return reply.send({ message: "Visit to Site B triggered — check server logs." });
});

app.get("/health", async (_req, reply) => reply.send({ status: "ok", site: "a" }));

// Start
async function main(): Promise<void> {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`[Site A] Server running at http://localhost:${PORT}`);
  // Register with gateway after a short delay (gateway needs to start first)
  setTimeout(() => {
    registerWithGateway().catch((err) => console.error("[Site A] Registration error:", err.message));
  }, 2000);
}

main().catch(console.error);
