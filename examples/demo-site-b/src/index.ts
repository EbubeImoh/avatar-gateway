/**
 * Demo Site B — a portfolio site that hosts an avatar and accepts visitors.
 *
 * Startup sequence:
 *   1. Generate Ed25519 keypair (site + avatar)
 *   2. Register with the gateway
 *   3. Serve HTTP on :4102
 */

import Fastify from "fastify";
import { generateIdentity, signPayload } from "@avatar-gateway/gateway";
import { AvatarRuntime, MockProvider } from "@avatar-gateway/avatar-runtime";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:4100";
const SITE_ORIGIN = process.env.SITE_B_ORIGIN ?? "http://localhost:4102";
const PORT = parseInt(process.env.SITE_B_PORT ?? "4102", 10);

// Generate keypairs
const siteIdentity = generateIdentity();
const avatarIdentity = generateIdentity();

// Avatar runtime (host avatar responds to visitors)
const runtime = new AvatarRuntime(
  {
    agentName: "Dev-bot",
    ownerDisplayName: "Site B Owner",
    tone: "friendly, helpful, professional",
    knowledge: [
      { id: "bio", visibility: "public", text: "Full-stack developer. Building cool things with TypeScript and Rust." },
      { id: "projects", visibility: "public", text: "Projects: open-source CLI tools, a personal blog, various web apps." },
      { id: "tech_stack", visibility: "public", text: "Tech stack: TypeScript, Node.js, React, SQLite, Fastify." },
      { id: "private_notes", visibility: "private", text: "Personal notes about salary and address (private)." },
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
  await gatewayPost("/v1/sites", {
    site_did: siteIdentity.did,
    origin: SITE_ORIGIN,
    display_name: "Demo Site B (Developer)",
    public_key_pem: siteIdentity.publicKeyPem,
    backend_url: `${SITE_ORIGIN}`,
    contact: "dev@site-b.example",
    offered_scopes: ["chat:send", "chat:receive", "page:read-public", "presence:announce"],
    public_paths: ["/", "/about", "/projects", "/projects/*", "/blog", "/blog/*"],
  });
  console.log(`[Site B] Registered with gateway (DID: ${siteIdentity.did.slice(0, 30)}...)`);

  await gatewayPost(`/v1/sites/${siteIdentity.did}/avatars`, {
    avatar_did: avatarIdentity.did,
    name: "Dev-bot",
    public_key_pem: avatarIdentity.publicKeyPem,
    public_bio: "Full-stack developer avatar.",
    look: { style: "brick-minifig", head: "smile", torso: "#26a641", legs: "#24292f" },
    travel: { enabled: true, max_visits_per_day: 10 },
  });
  console.log(`[Site B] Avatar registered (DID: ${avatarIdentity.did.slice(0, 30)}...)`);

  // Connect to gateway relay as host
  connectAsHost().catch((err) => console.error("[Site B] Host connect error:", err.message));
}

async function connectAsHost(): Promise<void> {
  // Site B listens for incoming messages on a persistent relay connection.
  // In production, this would be maintained as a long-lived authenticated connection.
  // For the demo we reconnect on-demand when a visitor arrives.
  console.log("[Site B] Ready to receive visitors.");
}

// HTTP server
const app = Fastify({ logger: false });

app.get("/", async (_req, reply) => {
  reply.type("text/html").send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Demo Site B — Developer</title>
<style>body{font-family:system-ui;max-width:700px;margin:2rem auto;padding:1rem;} .avatar-card{border:2px solid #172320;border-radius:17px;padding:1rem;max-width:300px;background:#fffef9;box-shadow:4px 4px 0 #172320;}</style>
</head>
<body>
<h1>Developer — Full-Stack Engineer</h1>
<p>Building cool things with TypeScript and Rust. This site has an avatar powered by avatar-gateway.</p>
<h2>Projects</h2><ul><li>Open-source CLI tools</li><li>Personal blog</li><li>Various web apps</li></ul>
<h2>Avatar</h2>
<div class="avatar-card"><strong>Dev-bot</strong><br><small>Full-stack developer avatar</small></div>
</body></html>`);
});

app.get("/about", async (_req, reply) => {
  reply.send({ name: "Site B Owner", role: "Full-Stack Developer", skills: ["TypeScript", "Rust", "React"] });
});

app.get("/projects", async (_req, reply) => {
  reply.send({ projects: ["cli-tools", "personal-blog", "web-apps"] });
});

// Visit hook — receives visit-offer from gateway
app.post<{ Body: { visit_id: string; visitor: { avatar_did: string; name: string; home_origin: string; look: unknown }; granted_scopes: string[] } }>(
  "/hooks/visit-offer",
  async (request, reply) => {
    const { visit_id, visitor, granted_scopes } = request.body;
    console.log(`[Site B] Visitor arriving: ${visitor.name} from ${visitor.home_origin} (visit: ${visit_id})`);

    // Auto-accept and connect as host
    setTimeout(() => {
      handleVisitorArrival(visit_id, visitor.name).catch((err) =>
        console.error("[Site B] Visitor handling error:", err.message),
      );
    }, 500);

    return reply.send({ decision: "accept", granted_scopes, limits: { max_turns: 20 } });
  },
);

async function handleVisitorArrival(visitId: string, visitorName: string): Promise<void> {
  const wsUrl = `ws://localhost:4100/v1/visits/${visitId}/session`;
  const ws = new WebSocket(wsUrl, { headers: { "x-ag-role": "host" } });
  let seq = 0;

  ws.on("open", () => {
    console.log(`[Site B] Connected to relay for visit ${visitId}`);
  });

  ws.on("message", async (data) => {
    const msg = JSON.parse(data.toString()) as { type: string; text?: string; from?: string; seq?: number };
    if (msg.type === "chat.message" && msg.text) {
      console.log(`[${visitorName} → Site B] "${msg.text}"`);

      // Generate a reply using the avatar runtime
      const replyText = await runtime.agentChat(msg.text);
      console.log(`[Site B] Responding: "${replyText}"`);

      seq++;
      const ts = new Date().toISOString();
      const payload = JSON.stringify({ type: "chat.message", visit_id: visitId, seq, from: avatarIdentity.did, text: replyText, ts });
      const sig = signPayload(payload, avatarIdentity.privateKeyPem);
      ws.send(JSON.stringify({ type: "chat.message", visit_id: visitId, seq, from: avatarIdentity.did, text: replyText, ts, sig }));
    } else if (msg.type === "visit.ended") {
      console.log(`[Site B] Visit ${visitId} ended.`);
      ws.close();
    }
  });

  ws.on("error", (err) => console.error(`[Site B] WebSocket error for ${visitId}:`, err.message));
  ws.on("close", () => console.log(`[Site B] WebSocket closed for visit ${visitId}`));
}

app.get("/health", async (_req, reply) => reply.send({ status: "ok", site: "b" }));

// Start
async function main(): Promise<void> {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`[Site B] Server running at http://localhost:${PORT}`);
  setTimeout(() => {
    registerWithGateway().catch((err) => console.error("[Site B] Registration error:", err.message));
  }, 2000);
}

main().catch(console.error);
