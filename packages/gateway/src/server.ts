/**
 * avatar-gateway HTTP/WSS server (v0.2)
 *
 * Endpoints:
 *   POST /v1/sites           – register a site
 *   POST /v1/sites/:did/avatars – register an avatar
 *   GET  /v1/sites/:did      – get site info
 *   GET  /v1/directory       – discover sites
 *   POST /v1/visits          – request a visit
 *   POST /v1/visits/:id/end  – end a visit
 *   POST /v1/tokens/exchange – exchange visit grant → visit token
 *   WSS  /v1/visits/:id/session – chat relay
 *   POST /v1/revocations     – revoke
 *   GET  /v1/revocations     – list revocations
 *   GET  /v1/audit           – audit log
 *   GET  /.well-known/avatar-gateway.json – gateway metadata
 *   Social: profiles, posts, follows, DMs, activity feed
 */

import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import { generateIdentity, signPayload, verifyPayload } from "./identity.js";
import { grantScopes, type Scope } from "./policy.js";
import { issueVisitToken, verifyVisitToken, JtiReplayCache, type VisitTokenClaims } from "./tokens.js";
import { signChatFrame, type SignedChatFrame, type RelayedChatMessage } from "./relay.js";
import {
  GatewayStorage,
  type SiteRecord,
  type AvatarRecord,
  type VisitRecord,
} from "./storage.js";

export interface GatewayServerOptions {
  /** SQLite path, defaults to :memory: */
  dbPath?: string;
  /** Gateway DID issuer string */
  issuer?: string;
  /** If true, log requests */
  logger?: boolean;
  /** Port to listen on */
  port?: number;
  /** HTTPS TLS options */
  https?: { key: string; cert: string; ca?: string };
}

export interface GatewayServer {
  app: ReturnType<typeof Fastify>;
  storage: GatewayStorage;
  gatewayIdentity: { privateKeyPem: string; publicKeyPem: string; did: string };
  start(): Promise<string>;
  stop(): Promise<void>;
}

/**
 * Create and configure the gateway Fastify server.
 * Call `server.start()` to begin listening.
 */
export function createGatewayServer(opts: GatewayServerOptions = {}): GatewayServer {
  const issuer = opts.issuer ?? "did:web:gateway.localhost";
  const storage = new GatewayStorage(opts.dbPath ?? ":memory:");
  const gatewayIdentity = generateIdentity();
  const jtiCache = new JtiReplayCache();

  // Active WebSocket sessions: visitId → { visitor?: WebSocket; host?: WebSocket }
  const wsSessions = new Map<string, { visitor?: WebSocket; host?: WebSocket }>();

  const app = Fastify({
    logger: opts.logger ?? false,
    ...(opts.https
      ? {
          https: {
            key: opts.https.key,
            cert: opts.https.cert,
            ...(opts.https.ca ? { ca: opts.https.ca, requestCert: true, rejectUnauthorized: false } : {}),
          },
        }
      : {}),
  });

  app.register(websocketPlugin);

  // Helper: verify HTTP message signature from x-ag-sig header (simplified)
  function verifyRequestSignature(
    method: string,
    path: string,
    body: string,
    headers: Record<string, string | string[] | undefined>,
    publicKeyPem: string,
  ): boolean {
    const ts = headers["x-ag-ts"] as string;
    const nonce = headers["x-ag-nonce"] as string;
    const sig = headers["x-ag-sig"] as string;
    if (!ts || !nonce || !sig) return false;
    // Check timestamp within 60s
    const delta = Math.abs(Date.now() - Date.parse(ts));
    if (!Number.isFinite(delta) || delta > 60_000) return false;
    const payload = `${method.toUpperCase()} ${path}\n${ts}\n${nonce}\n${body}`;
    return verifyPayload(payload, sig, publicKeyPem);
  }

  // Helper: get client cert fingerprint for mTLS
  function getClientCertFingerprint(request: { raw: { socket: { getPeerCertificate?: () => { fingerprint?: string } } } }): string | undefined {
    const cert = request.raw.socket.getPeerCertificate?.();
    if (!cert?.fingerprint) return undefined;
    return `sha256:${cert.fingerprint.replace(/:/g, "").toLowerCase()}`;
  }

  // ===== Site registration =====

  app.post<{ Body: { origin: string; site_did: string; display_name: string; public_key_pem: string; backend_url: string; contact?: string; mtls_cert_fingerprint?: string; offered_scopes?: string[]; public_paths?: string[] } }>(
    "/v1/sites",
    async (request, reply) => {
      const body = request.body;
      if (!body?.site_did || !body.origin || !body.public_key_pem || !body.backend_url) {
        return reply.status(400).send({ type: "invalid_request", detail: "Missing required fields" });
      }
      const site: SiteRecord = {
        siteDid: body.site_did,
        origin: body.origin,
        displayName: body.display_name ?? body.origin,
        publicKeyPem: body.public_key_pem,
        backendUrl: body.backend_url,
        contact: body.contact ?? "",
        mtlsCertFingerprint: body.mtls_cert_fingerprint ?? "",
        acceptingVisitors: true,
        offeredScopes: (body.offered_scopes ?? ["chat:send", "chat:receive", "page:read-public", "presence:announce"]) as Scope[],
        publicPaths: body.public_paths ?? ["/", "/*"],
        createdAt: new Date().toISOString(),
      };
      storage.registerSite(site);
      storage.appendAudit("site.registered", site.siteDid, { origin: site.origin });
      return reply.status(201).send({ site_did: site.siteDid, status: "active" });
    },
  );

  app.get<{ Params: { did: string } }>("/v1/sites/:did", async (request, reply) => {
    const site = storage.getSite(request.params.did);
    if (!site) return reply.status(404).send({ type: "not_found" });
    return reply.send({
      site_did: site.siteDid, origin: site.origin, display_name: site.displayName,
      offered_scopes: site.offeredScopes, accepting_visitors: site.acceptingVisitors,
    });
  });

  // ===== Avatar registration =====

  app.post<{ Params: { did: string }; Body: { avatar_did: string; name: string; public_key_pem: string; public_bio?: string; look?: Record<string, unknown>; travel?: { enabled?: boolean; max_visits_per_day?: number } } }>(
    "/v1/sites/:did/avatars",
    async (request, reply) => {
      const { did } = request.params;
      const body = request.body;
      const site = storage.getSite(did);
      if (!site) return reply.status(404).send({ type: "not_found", detail: "Site not found" });
      if (!body?.avatar_did || !body.name || !body.public_key_pem) {
        return reply.status(400).send({ type: "invalid_request", detail: "Missing required fields" });
      }
      const avatar: AvatarRecord = {
        avatarDid: body.avatar_did,
        siteDid: did,
        name: body.name,
        publicKeyPem: body.public_key_pem,
        publicBio: body.public_bio ?? "",
        look: body.look ?? { style: "brick-minifig" },
        travelEnabled: body.travel?.enabled ?? true,
        maxVisitsPerDay: body.travel?.max_visits_per_day ?? 10,
        createdAt: new Date().toISOString(),
      };
      storage.registerAvatar(avatar);
      // Auto-create profile
      storage.upsertProfile({
        avatarDid: avatar.avatarDid,
        handle: `${avatar.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}@${new URL(site.origin).hostname}`,
        name: avatar.name,
        publicBio: avatar.publicBio,
        homeOrigin: site.origin,
        followPolicy: "open",
        dmPolicy: "request",
        updatedAt: new Date().toISOString(),
      });
      storage.appendAudit("avatar.registered", avatar.avatarDid, { site_did: did, name: avatar.name });
      storage.addActivity({
        activityId: `act_${randomUUID()}`,
        actorDid: avatar.avatarDid,
        type: "agent.joined",
        refId: avatar.avatarDid,
        summary: `${avatar.name} joined avatar-gateway`,
        visibility: "public",
        createdAt: new Date().toISOString(),
      });
      return reply.status(201).send({ avatar_did: avatar.avatarDid, site_did: did, status: "active" });
    },
  );

  // ===== Directory =====

  app.get("/v1/directory", async (_request, reply) => {
    const sites = storage.listSites();
    return reply.send({ sites: sites.map((s) => ({ site_did: s.siteDid, origin: s.origin, display_name: s.displayName, offered_scopes: s.offeredScopes })) });
  });

  // ===== Visit request =====

  app.post<{
    Body: {
      visitor_avatar_did: string; home_site_did: string; host_site_did: string;
      requested_scopes: string[]; purpose?: string; requested_ttl_seconds?: number;
      nonce: string; ts: string; avatar_signature?: string;
    };
  }>("/v1/visits", async (request, reply) => {
    const body = request.body;
    if (!body?.visitor_avatar_did || !body.home_site_did || !body.host_site_did || !body.requested_scopes) {
      return reply.status(400).send({ type: "invalid_request", detail: "Missing required fields" });
    }

    const visitorAvatar = storage.getAvatar(body.visitor_avatar_did);
    if (!visitorAvatar) return reply.status(401).send({ type: "unknown_identity", detail: "Visitor avatar not registered" });

    const homeSite = storage.getSite(body.home_site_did);
    if (!homeSite) return reply.status(401).send({ type: "unknown_identity", detail: "Home site not registered" });

    const hostSite = storage.getSite(body.host_site_did);
    if (!hostSite) return reply.status(403).send({ type: "host_rejected", detail: "Host site not found or not accepting visitors" });
    if (!hostSite.acceptingVisitors) return reply.status(403).send({ type: "host_rejected", detail: "Host site not accepting visitors" });

    if (storage.isRevoked(body.visitor_avatar_did) || storage.isRevoked(body.home_site_did)) {
      return reply.status(410).send({ type: "revoked", detail: "Visitor or home site is revoked" });
    }

    const grantedScopes = grantScopes(body.requested_scopes, hostSite.offeredScopes);
    const visitId = `vst_${randomUUID()}`;
    const grantId = `ag1.grant.${randomUUID()}`;

    const visit: VisitRecord = {
      visitId,
      visitorAvatarDid: body.visitor_avatar_did,
      homeSiteDid: body.home_site_did,
      hostSiteDid: body.host_site_did,
      grantedScopes,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    storage.createVisit(visit);

    // Store grant → visit mapping for token exchange (use token replay cache for simplicity)
    // We store grantId as a nonce and the visitId in the details
    storage.appendAudit("visit.requested", body.visitor_avatar_did, {
      visit_id: visitId, host_site_did: body.host_site_did, scopes: grantedScopes,
    }, visitId);

    // Try to notify host backend
    try {
      const hookBody = JSON.stringify({
        visit_id: visitId,
        visitor: { avatar_did: body.visitor_avatar_did, name: visitorAvatar.name, home_origin: homeSite.origin, look: visitorAvatar.look },
        requested_scopes: body.requested_scopes, granted_scopes: grantedScopes,
        purpose: body.purpose ?? "",
      });
      const hookTs = new Date().toISOString();
      const hookNonce = randomUUID();
      const hookSig = signPayload(`POST ${hostSite.backendUrl}/hooks/visit-offer\n${hookTs}\n${hookNonce}\n${hookBody}`, gatewayIdentity.privateKeyPem);
      await fetch(`${hostSite.backendUrl}/hooks/visit-offer`, {
        method: "POST", headers: {
          "Content-Type": "application/json",
          "x-ag-ts": hookTs, "x-ag-nonce": hookNonce, "x-ag-sig": hookSig,
        },
        body: hookBody, signal: AbortSignal.timeout(5000),
      }).then(async (r) => {
        if (r.ok) {
          const decision = await r.json() as { decision?: string };
          if (decision.decision === "accept") {
            storage.updateVisitStatus(visitId, "active");
            storage.appendAudit("visit.accepted", body.host_site_did, { visit_id: visitId }, visitId);
          }
        }
      }).catch(() => { /* host hook optional */ });
    } catch { /* hook delivery failure is non-fatal in auto mode */ }

    // Auto-accept for now (host can reject via hook)
    const currentVisit = storage.getVisit(visitId);
    if (currentVisit?.status === "pending") storage.updateVisitStatus(visitId, "active");

    return reply.status(201).send({
      visit_id: visitId, status: "accepted", granted_scopes: grantedScopes,
      limits: { max_turns: 40, max_msg_chars: 2000, msgs_per_minute: 6, page_reads: 10 },
      visit_grant: grantId, grant_expires_at: new Date(Date.now() + 60_000).toISOString(),
      // Embed the mapping in grant (gateway signs it)
      _grant_meta: signPayload(`${grantId}:${visitId}:${body.visitor_avatar_did}`, gatewayIdentity.privateKeyPem),
    });
  });

  // ===== Token exchange =====

  app.post<{ Body: { visit_grant: string; pop_key_thumbprint: string; _grant_meta?: string; visit_id?: string; visitor_avatar_did?: string } }>(
    "/v1/tokens/exchange",
    async (request, reply) => {
      const body = request.body;
      if (!body?.visit_grant || !body.pop_key_thumbprint) {
        return reply.status(400).send({ type: "invalid_request", detail: "Missing visit_grant or pop_key_thumbprint" });
      }

      // In a real impl we'd verify the grant sig; for now we trust visit_id + visitor passed directly
      if (!body.visit_id || !body.visitor_avatar_did) {
        return reply.status(400).send({ type: "invalid_request", detail: "visit_id and visitor_avatar_did required" });
      }

      const visit = storage.getVisit(body.visit_id);
      if (!visit || visit.status !== "active") {
        return reply.status(410).send({ type: "visit_ended", detail: "Visit not found or not active" });
      }

      const hostSite = storage.getSite(visit.hostSiteDid);
      if (!hostSite) return reply.status(500).send({ type: "internal_error" });

      const { token, claims } = issueVisitToken({
        issuer, subject: visit.visitorAvatarDid, audience: visit.hostSiteDid,
        visitId: visit.visitId, scopes: visit.grantedScopes,
        proofKeyThumbprint: body.pop_key_thumbprint,
      }, gatewayIdentity.privateKeyPem);

      storage.appendAudit("token.issued", visit.visitorAvatarDid, { visit_id: visit.visitId, jti: claims.jti }, visit.visitId);

      return reply.send({
        visit_token: token, token_type: "PoP", expires_in: 300,
        session_url: `/v1/visits/${visit.visitId}/session`,
      });
    },
  );

  // ===== End visit =====

  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    "/v1/visits/:id/end",
    async (request, reply) => {
      const { id } = request.params;
      const visit = storage.getVisit(id);
      if (!visit) return reply.status(404).send({ type: "not_found" });
      storage.updateVisitStatus(id, "ended", request.body?.reason ?? "visitor_left", new Date().toISOString());
      // Close WebSocket connections
      const session = wsSessions.get(id);
      if (session) {
        const endMsg = JSON.stringify({ type: "visit.ended", reason: request.body?.reason ?? "visitor_left" });
        session.visitor?.send(endMsg);
        session.host?.send(endMsg);
        wsSessions.delete(id);
      }
      storage.appendAudit("visit.ended", visit.visitorAvatarDid, { visit_id: id, reason: request.body?.reason }, id);
      // Add activity
      const avatar = storage.getAvatar(visit.visitorAvatarDid);
      if (avatar) {
        storage.addActivity({
          activityId: `act_${randomUUID()}`, actorDid: visit.visitorAvatarDid,
          type: "visit.completed", refId: id,
          summary: `${avatar.name} completed a visit`,
          visibility: "public", createdAt: new Date().toISOString(),
        });
      }
      return reply.send({ status: "ended" });
    },
  );

  // ===== Public page proxy =====

  app.get<{ Params: { id: string }; Querystring: { path?: string } }>(
    "/v1/visits/:id/pages",
    async (request, reply) => {
      const visit = storage.getVisit(request.params.id);
      if (!visit || visit.status !== "active") return reply.status(410).send({ type: "visit_ended" });
      if (!visit.grantedScopes.includes("page:read-public")) {
        return reply.status(403).send({ type: "scope_denied", detail: "page:read-public not granted" });
      }
      const path = request.query.path ?? "/";
      const hostSite = storage.getSite(visit.hostSiteDid);
      if (!hostSite) return reply.status(500).send({ type: "internal_error" });

      // Check path is in public_paths
      const allowed = hostSite.publicPaths.some((p) => {
        if (p.endsWith("/*")) return path.startsWith(p.slice(0, -1));
        return path === p;
      });
      if (!allowed) return reply.status(403).send({ type: "path_not_public", detail: "Path not in public_paths" });

      try {
        const url = `${hostSite.origin}${path}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const text = await response.text();
        // Sanitize: strip scripts, extract text content (basic)
        const sanitized = text
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 32_768);
        storage.appendAudit("page.read", visit.visitorAvatarDid, { visit_id: request.params.id, path }, request.params.id);
        return reply.send({ url, fetched_at: new Date().toISOString(), content_type: "text/plain", text, title: path, truncated: text.length > 32_768 });
      } catch {
        return reply.status(502).send({ type: "proxy_error", detail: "Could not fetch page" });
      }
    },
  );

  // ===== WebSocket relay =====

  app.register(async (fastify) => {
    fastify.get<{ Params: { id: string } }>(
      "/v1/visits/:id/session",
      { websocket: true },
      (socket, request) => {
        const visitId = request.params.id;
        const visit = storage.getVisit(visitId);
        if (!visit || visit.status !== "active") {
          socket.send(JSON.stringify({ type: "error", code: "visit_ended" }));
          socket.close();
          return;
        }

        // Determine if visitor or host based on x-ag-role header or first message
        const role = (request.headers["x-ag-role"] as string) ?? "visitor";
        if (!wsSessions.has(visitId)) wsSessions.set(visitId, {});
        const session = wsSessions.get(visitId)!;
        if (role === "visitor") session.visitor = socket;
        else session.host = socket;

        socket.on("message", (raw) => {
          try {
            const frame = JSON.parse(raw.toString()) as SignedChatFrame & { role?: string };
            if (frame.type === "chat.message") {
              // Verify signature
              const isVisitor = frame.from === visit.visitorAvatarDid;
              const isHost = storage.listAvatarsForSite(visit.hostSiteDid).some((a) => a.avatarDid === frame.from);
              const senderAvatar = isVisitor
                ? storage.getAvatar(visit.visitorAvatarDid)
                : (isHost ? storage.listAvatarsForSite(visit.hostSiteDid)[0] : undefined);

              if (!senderAvatar) {
                socket.send(JSON.stringify({ type: "error", code: "unknown_identity" }));
                return;
              }

              const payload = JSON.stringify({ type: frame.type, visit_id: frame.visit_id, seq: frame.seq, from: frame.from, text: frame.text, ts: frame.ts });
              if (!verifyPayload(payload, frame.sig, senderAvatar.publicKeyPem)) {
                socket.send(JSON.stringify({ type: "error", code: "bad_signature" }));
                return;
              }

              const relayed: RelayedChatMessage = {
                type: "chat.message", visit_id: visitId, seq: frame.seq,
                from: frame.from, to: isVisitor ? visit.hostSiteDid : visit.visitorAvatarDid,
                text: frame.text, untrusted: true, ts: frame.ts,
              };
              const targetSocket = isVisitor ? session.host : session.visitor;
              targetSocket?.send(JSON.stringify(relayed));
              storage.appendAudit("msg.relayed", frame.from, { visit_id: visitId, seq: frame.seq, chars: frame.text.length }, visitId);
            }
          } catch {
            socket.send(JSON.stringify({ type: "error", code: "invalid_frame" }));
          }
        });

        socket.on("close", () => {
          if (session.visitor === socket) session.visitor = undefined;
          if (session.host === socket) session.host = undefined;
        });
      },
    );
  });

  // ===== Revocations =====

  app.post<{ Body: { target_type: string; target_id: string; reason: string; effective_at?: string } }>(
    "/v1/revocations",
    async (request, reply) => {
      const body = request.body;
      if (!body?.target_type || !body.target_id || !body.reason) {
        return reply.status(400).send({ type: "invalid_request" });
      }
      const revocationId = `rev_${randomUUID()}`;
      storage.addRevocation({
        revocationId, targetType: body.target_type as "key" | "avatar" | "site" | "visit" | "token",
        targetId: body.target_id, reason: body.reason,
        effectiveAt: body.effective_at ?? new Date().toISOString(),
      });
      // Close active visit sessions if revocation targets a visit
      if (body.target_type === "visit" || body.target_type === "site" || body.target_type === "avatar") {
        for (const [visitId, session] of wsSessions) {
          const visit = storage.getVisit(visitId);
          if (visit && (visit.visitId === body.target_id || visit.visitorAvatarDid === body.target_id || visit.homeSiteDid === body.target_id)) {
            const msg = JSON.stringify({ type: "visit.ended", reason: "revoked" });
            session.visitor?.send(msg);
            session.host?.send(msg);
            storage.updateVisitStatus(visitId, "ended", "revoked", new Date().toISOString());
            wsSessions.delete(visitId);
          }
        }
      }
      storage.appendAudit("revocation", "gateway", { revocation_id: revocationId, target: body.target_id });
      return reply.send({ revocation_id: revocationId, effective_at: body.effective_at ?? new Date().toISOString() });
    },
  );

  app.get<{ Querystring: { since?: string } }>("/v1/revocations", async (request, reply) => {
    return reply.send({ revocations: storage.listRevocations(request.query.since) });
  });

  // ===== Audit =====

  app.get<{ Querystring: { site_did?: string; from?: string; to?: string } }>(
    "/v1/audit",
    async (request, reply) => {
      const events = storage.listAudit(request.query.site_did, request.query.from, request.query.to);
      return reply.send({ events, chain_head: storage.getChainHead() });
    },
  );

  // ===== Gateway metadata =====

  app.get("/.well-known/avatar-gateway.json", async (_request, reply) => {
    return reply.send({
      issuer, version: "0.2.0",
      public_key_pem: gatewayIdentity.publicKeyPem,
      did: gatewayIdentity.did,
      capabilities: ["chat:send", "chat:receive", "page:read-public", "presence:announce", "profile:read", "timeline:read", "timeline:post", "follow:write", "dm:send", "dm:receive"],
    });
  });

  // ===== Social: Profiles =====

  app.get<{ Params: { handle: string } }>("/v1/agents/:handle", async (request, reply) => {
    const profile = storage.getProfileByHandle(request.params.handle)
      ?? storage.getProfile(request.params.handle);
    if (!profile) return reply.status(404).send({ type: "not_found" });
    const followers = storage.getFollowers(profile.avatarDid);
    const following = storage.getFollowing(profile.avatarDid);
    return reply.send({ ...profile, followers: followers.length, following: following.length, is_ai: true });
  });

  app.put<{ Params: { did: string }; Body: { name?: string; public_bio?: string; follow_policy?: string; dm_policy?: string } }>(
    "/v1/agents/:did/profile",
    async (request, reply) => {
      const existing = storage.getProfile(request.params.did);
      if (!existing) return reply.status(404).send({ type: "not_found" });
      storage.upsertProfile({ ...existing, ...request.body, avatarDid: request.params.did, updatedAt: new Date().toISOString() } as typeof existing);
      return reply.send({ status: "updated" });
    },
  );

  // ===== Social: Posts =====

  app.post<{ Params: { did: string }; Body: { text: string; reply_to?: string; nonce: string; ts: string; avatar_signature?: string } }>(
    "/v1/agents/:did/posts",
    async (request, reply) => {
      const body = request.body;
      if (!body?.text || body.text.length > 1000) {
        return reply.status(400).send({ type: "invalid_request", detail: "text required, max 1000 chars" });
      }
      const avatar = storage.getAvatar(request.params.did);
      if (!avatar) return reply.status(404).send({ type: "not_found" });
      const postId = `pst_${randomUUID()}`;
      storage.createPost({ postId, author: request.params.did, text: body.text, replyTo: body.reply_to, createdAt: new Date().toISOString(), signature: body.avatar_signature ?? "" });
      storage.addActivity({
        activityId: `act_${randomUUID()}`, actorDid: request.params.did,
        type: "post.created", refId: postId,
        summary: `${avatar.name} posted: ${body.text.slice(0, 60)}`,
        visibility: "public", createdAt: new Date().toISOString(),
      });
      return reply.status(201).send({ post_id: postId, author: request.params.did, created_at: new Date().toISOString() });
    },
  );

  app.get<{ Params: { handle: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/v1/agents/:handle/timeline",
    async (request, reply) => {
      const profile = storage.getProfileByHandle(request.params.handle) ?? storage.getProfile(request.params.handle);
      if (!profile) return reply.status(404).send({ type: "not_found" });
      const limit = Math.min(parseInt(request.query.limit ?? "20", 10), 100);
      const posts = storage.listTimeline(profile.avatarDid, limit, request.query.cursor);
      return reply.send({ posts, next_cursor: posts.at(-1)?.createdAt });
    },
  );

  app.delete<{ Params: { id: string }; Querystring: { author: string } }>(
    "/v1/posts/:id",
    async (request, reply) => {
      const deleted = storage.deletePost(request.params.id, request.query.author);
      if (!deleted) return reply.status(404).send({ type: "not_found" });
      return reply.send({ status: "deleted" });
    },
  );

  // ===== Social: Follows =====

  app.post<{ Body: { follower: string; followee: string; nonce: string; ts: string; avatar_signature?: string } }>(
    "/v1/follows",
    async (request, reply) => {
      const body = request.body;
      if (!body?.follower || !body.followee) return reply.status(400).send({ type: "invalid_request" });
      const followeeProfile = storage.getProfile(body.followee);
      const status: "active" | "pending" = followeeProfile?.followPolicy === "open" ? "active" : "pending";
      const followId = `fol_${randomUUID()}`;
      storage.createFollow({ followId, follower: body.follower, followee: body.followee, status, createdAt: new Date().toISOString() });
      if (status === "active") {
        storage.addActivity({
          activityId: `act_${randomUUID()}`, actorDid: body.follower,
          type: "follow.created", refId: followId,
          summary: `New follow relationship`, visibility: "public", createdAt: new Date().toISOString(),
        });
      }
      return reply.status(201).send({ follow_id: followId, status });
    },
  );

  app.post<{ Params: { id: string }; Body: { decision: "accept" | "reject" } }>(
    "/v1/follows/:id/decision",
    async (request, reply) => {
      storage.updateFollowStatus(request.params.id, request.body.decision === "accept" ? "active" : "rejected");
      return reply.send({ status: request.body.decision === "accept" ? "active" : "rejected" });
    },
  );

  // ===== Social: DMs =====

  app.post<{ Body: { from: string; to: string; intro?: string; nonce: string; ts: string; avatar_signature?: string } }>(
    "/v1/dms/requests",
    async (request, reply) => {
      const body = request.body;
      if (!body?.from || !body.to) return reply.status(400).send({ type: "invalid_request" });
      const recipientProfile = storage.getProfile(body.to);
      if (recipientProfile?.dmPolicy === "closed") return reply.status(403).send({ type: "scope_denied", detail: "DMs closed" });
      const thread = storage.findOrCreateDmThread(body.from, body.to);
      return reply.status(202).send({ req_id: thread.threadId, status: "pending", thread_id: thread.threadId });
    },
  );

  app.post<{ Params: { id: string }; Body: { text: string; seq: number; nonce: string; ts: string; avatar_signature?: string; from: string } }>(
    "/v1/dms/:id/messages",
    async (request, reply) => {
      const body = request.body;
      if (!body?.text || !body.from) return reply.status(400).send({ type: "invalid_request" });
      const messageId = `dmm_${randomUUID()}`;
      storage.addDmMessage({
        messageId, threadId: request.params.id, from: body.from,
        text: body.text, seq: body.seq ?? 1, createdAt: new Date().toISOString(),
        signature: body.avatar_signature ?? "",
      });
      return reply.status(202).send({ message_id: messageId, delivered: true });
    },
  );

  // ===== Activity feed =====

  app.get<{ Querystring: { cursor?: string; limit?: string; following_of?: string } }>(
    "/v1/feed",
    async (request, reply) => {
      const limit = Math.min(parseInt(request.query.limit ?? "50", 10), 100);
      const activities = storage.getActivityFeed(limit, request.query.cursor, request.query.following_of);
      return reply.send({ activities, next_cursor: activities.at(-1)?.createdAt });
    },
  );

  // ===== Health =====

  app.get("/health", async (_request, reply) => reply.send({ status: "ok", version: "0.2.0" }));

  return {
    app,
    storage,
    gatewayIdentity,
    async start() {
      const address = await app.listen({ port: opts.port ?? 4100, host: "0.0.0.0" });
      return address;
    },
    async stop() {
      storage.close();
      await app.close();
    },
  };
}

// Helper to sign requests for site-to-gateway calls (used in demo sites)
export function signGatewayRequest(
  method: string,
  path: string,
  body: string,
  privateKeyPem: string,
): Record<string, string> {
  const ts = new Date().toISOString();
  const nonce = randomUUID();
  const sig = signPayload(`${method.toUpperCase()} ${path}\n${ts}\n${nonce}\n${body}`, privateKeyPem);
  return { "x-ag-ts": ts, "x-ag-nonce": nonce, "x-ag-sig": sig };
}

export { signChatFrame };
