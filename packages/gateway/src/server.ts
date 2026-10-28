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
import { randomUUID, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import type { TLSSocket } from "node:tls";
import type { WebSocket } from "ws";
import { didKeyFromPublicKey, generateIdentity, signPayload, verifyPayload } from "./identity.js";
import { GATEWAY_MAX_SCOPES, GATEWAY_NETWORK_SCOPES, grantScopes, type Scope } from "./policy.js";
import {
  issueVisitToken, verifyVisitToken, JtiReplayCache, proofKeyThumbprint, proofSignaturePayload,
  type VisitTokenClaims,
} from "./tokens.js";
import { signChatFrame, type SignedChatFrame, type RelayedChatMessage } from "./relay.js";
import {
  GatewayStorage,
  type SiteRecord,
  type AvatarRecord,
  type VisitRecord,
  type BillingAdapter,
  type TenantRecord,
  DEFAULT_TENANT_QUOTAS,
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
  /** Bind interface; loopback by default. */
  host?: string;
  /** HTTPS TLS options */
  https?: { key: string; cert: string; ca?: string };
  /** Optional billing adapter for usage metering (no payment provider hard-wired). */
  billingAdapter?: BillingAdapter;
  /** Require tenant API keys on /v1 routes. */
  hostedMode?: boolean;
  /** Operator secret required to create tenant credentials. */
  tenantAdminKey?: string;
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
  const signedRequestNonces = new Map<string, number>();
  const billingAdapter = opts.billingAdapter;
  const tenantForRequest = new WeakMap<object, TenantRecord>();
  const verifiedAgentForRequest = new WeakMap<object, string>();

  function isSocialWriteRoute(method: string, url: string): boolean {
    const pathname = new URL(url, "http://gateway.local").pathname;
    const verb = method.toUpperCase();
    return (verb === "PUT" && /^\/v1\/agents\/[^/]+\/profile$/.test(pathname)) ||
      (verb === "POST" && /^\/v1\/agents\/[^/]+\/posts$/.test(pathname)) ||
      ((verb === "POST" || verb === "DELETE") && /^\/v1\/posts\/[^/]+(?:\/(?:replies|likes|reposts))?$/.test(pathname)) ||
      ((verb === "POST" || verb === "DELETE") && /^\/v1\/follows(?:\/[^/]+(?:\/decision)?)?$/.test(pathname)) ||
      ((verb === "POST" || verb === "DELETE") && pathname === "/v1/blocks") ||
      (verb === "POST" && pathname === "/v1/reports") ||
      ((verb === "POST" || verb === "DELETE") && pathname === "/v1/spam-flags") ||
      (verb === "POST" && /^\/v1\/dms\/(?:requests|[^/]+\/(?:decision|messages))$/.test(pathname));
  }

  function requiredNetworkScope(method: string, url: string): Scope | undefined {
    const parsed = new URL(url, "http://gateway.local");
    const pathname = parsed.pathname;
    const verb = method.toUpperCase();
    if (verb === "PUT" && /^\/v1\/agents\/[^/]+\/profile$/.test(pathname)) return "profile:write";
    if ((verb === "POST" || verb === "DELETE") && /^\/v1\/agents\/[^/]+\/posts$/.test(pathname)) return "timeline:post";
    if ((verb === "POST" || verb === "DELETE") && /^\/v1\/posts\/[^/]+(?:\/(?:replies|likes|reposts))?$/.test(pathname)) return "timeline:post";
    if ((verb === "POST" || verb === "DELETE") && /^\/v1\/follows(?:\/[^/]+(?:\/decision)?)?$/.test(pathname)) return "follow:write";
    if ((verb === "POST" || verb === "DELETE") && pathname === "/v1/blocks") return "block:write";
    if (verb === "POST" && pathname === "/v1/reports") return "block:write";
    if ((verb === "POST" || verb === "DELETE") && pathname === "/v1/spam-flags") return "block:write";
    if (verb === "POST" && pathname === "/v1/dms/requests") return "dm:send";
    if (verb === "POST" && /^\/v1\/dms\/[^/]+\/decision$/.test(pathname)) return "dm:receive";
    if (verb === "POST" && /^\/v1\/dms\/[^/]+\/messages$/.test(pathname)) return "dm:send";
    if (verb === "GET" && /^\/v1\/dms\/[^/]+\/sequence$/.test(pathname)) return "dm:send";
    if (verb === "GET" && /^\/v1\/agents\/[^/]+\/home$/.test(pathname)) return "timeline:read";
    if (verb === "GET" && pathname === "/v1/feed" && parsed.searchParams.has("following_of")) return "feed:read";
    if (verb === "GET" && (pathname === "/v1/dms" || /^\/v1\/dms\/[^/]+\/messages$/.test(pathname))) return "dm:receive";
    if (verb === "GET" && /^\/v1\/agents\/[^/]+\/signals$/.test(pathname)) return "block:write";
    return undefined;
  }

  // Active WebSocket sessions and per-visit limits.
  const wsSessions = new Map<string, {
    visitor?: WebSocket; host?: WebSocket; visitorTimes: number[]; hostTimes: number[]; messageCount: number;
    lastSeqBySender: Map<string, number>;
  }>();
  const wsAuth = new WeakMap<WebSocket, { role: "visitor" | "host"; lastSeq: number }>();
  const wsExpiryTimers = new WeakMap<WebSocket, ReturnType<typeof setTimeout>>();

  const app = Fastify({
    logger: opts.logger ?? false,
    ...(opts.https
      ? {
          https: {
            key: opts.https.key,
            cert: opts.https.cert,
            ...(opts.https.ca ? { ca: opts.https.ca, requestCert: true, rejectUnauthorized: true } : {}),
          },
        }
      : {}),
  });

  app.register(websocketPlugin, { options: { maxPayload: 16_384 } });

  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/v1/") || new URL(request.url, "http://gateway.local").pathname === "/v1/tenants" || request.headers.upgrade === "websocket") return;
    const tenantKey = request.headers["x-tenant-key"];
    if (typeof tenantKey !== "string") {
      if (opts.hostedMode) return reply.status(401).send({ type: "unauthorized", detail: "x-tenant-key is required" });
    } else {
      const tenant = storage.getTenantByApiKey(tenantKey);
      if (!tenant) return reply.status(401).send({ type: "unauthorized", detail: "Invalid tenant key" });
      const now = Date.now();
      const minuteStart = new Date(now - 60_000).toISOString();
      const calls = storage.getTenantDailyUsage(tenant.tenantId, "api.call", minuteStart);
      if (calls >= tenant.quotas.apiCallsPerMinute) {
        return reply.status(429).send({ type: "rate_limited", detail: "Tenant API call limit exceeded" });
      }
      tenantForRequest.set(request, tenant);
      storage.recordUsage({ tenantId: tenant.tenantId, eventType: "api.call", quantity: 1, ts: new Date(now).toISOString() }, billingAdapter);
    }

    const requiredScope = requiredNetworkScope(request.method, request.url);
    if (isSocialWriteRoute(request.method, request.url) || requiredScope) {
      const agentDid = request.headers["x-ag-agent-did"];
      const isOwnerSession = typeof request.headers["x-ag-site-did"] === "string" || typeof request.headers.cookie === "string";
      if (typeof agentDid !== "string") {
        const ownerWrite = isOwnerSession && isSocialWriteRoute(request.method, request.url);
        return reply.status(ownerWrite ? 403 : 401).send({ type: ownerWrite ? "observer_read_only" : "unauthorized" });
      }
      if (!verifyAgentRequest(request, agentDid)) {
        const ownerWrite = isOwnerSession && isSocialWriteRoute(request.method, request.url);
        return reply.status(ownerWrite ? 403 : 401).send({ type: ownerWrite ? "observer_read_only" : "invalid_agent_signature" });
      }
      if (requiredScope && !storage.getAvatar(agentDid)?.networkScopes?.includes(requiredScope)) {
        return reply.status(403).send({ type: "scope_denied", detail: `The avatar does not grant ${requiredScope}.` });
      }
    }
  });

  function meterTenantUsage(
    request: object,
    eventType: "visit.started" | "post.created" | "like.created" | "repost.created" | "dm.sent" | "page.read",
    metadata?: Record<string, unknown>,
  ): boolean {
    const tenant = tenantForRequest.get(request);
    if (!tenant) return true;
    const quotaResource = eventType === "visit.started" ? "visitsPerDay"
      : eventType === "post.created" ? "postsPerDay"
      : eventType === "like.created" ? "likesPerDay"
      : eventType === "repost.created" ? "repostsPerDay"
      : eventType === "dm.sent" ? "dmRequestsPerDay"
      : undefined;
    if (quotaResource && !storage.checkTenantQuota(tenant.tenantId, quotaResource).allowed) return false;
    storage.recordUsage({ tenantId: tenant.tenantId, eventType, quantity: 1, ts: new Date().toISOString(), metadata }, billingAdapter);
    return true;
  }

  function dailyQuotaReached(
    agentDid: string,
    resource: "posts" | "likes" | "reposts" | "follows" | "dmRequests",
    limit: number,
  ): boolean {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const since = dayStart.toISOString();
    const used = resource === "posts" ? storage.countPostsSince(agentDid, since)
      : resource === "likes" ? storage.countLikesSince(agentDid, since)
      : resource === "reposts" ? storage.countRepostsSince(agentDid, since)
      : resource === "follows" ? storage.countFollowsSince(agentDid, since)
      : storage.countDmRequestsSince(agentDid, since);
    return used >= limit;
  }

  // Verify signed site requests and bound memory use for the replay cache.
  function verifyRequestSignature(
    method: string,
    path: string,
    body: string,
    headers: Record<string, string | string[] | undefined>,
    publicKeyPem: string,
  ): boolean {
    const header = (name: string): string | undefined => {
      const value = headers[name];
      return typeof value === "string" ? value : undefined;
    };
    const ts = header("x-ag-ts");
    const nonce = header("x-ag-nonce");
    const sig = header("x-ag-sig");
    if (!ts || !nonce || nonce.length < 16 || nonce.length > 200 || !sig) return false;
    const delta = Math.abs(Date.now() - Date.parse(ts));
    if (!Number.isFinite(delta) || delta > 60_000) return false;
    const payload = `${method.toUpperCase()} ${path}\n${ts}\n${nonce}\n${body}`;
    if (!verifyPayload(payload, sig, publicKeyPem)) return false;
    const now = Date.now();
    for (const [key, expiry] of signedRequestNonces) if (expiry <= now) signedRequestNonces.delete(key);
    const replayKey = `${didKeyFromPublicKey(publicKeyPem)}:${nonce}`;
    if (signedRequestNonces.has(replayKey) || signedRequestNonces.size >= 100_000) return false;
    signedRequestNonces.set(replayKey, now + 120_000);
    return true;
  }

  type SignedGatewayRequest = { method: string; raw: IncomingMessage; body?: unknown; headers: IncomingHttpHeaders };

  function verifySignedBody(request: SignedGatewayRequest, publicKeyPem: string): boolean {
    try {
      return verifyRequestSignature(
        request.method,
        request.raw.url ?? "/",
        request.body === undefined ? "" : JSON.stringify(request.body),
        request.headers,
        publicKeyPem,
      );
    } catch {
      return false;
    }
  }

  function normalizeFingerprint(value: string): string {
    return value.replace(/^sha256:/i, "").replace(/:/g, "").toLowerCase();
  }

  // A configured CA enables mandatory mutual TLS and binds the peer certificate to the registered site.
  function verifyClientCertificate(request: { raw: IncomingMessage }, expectedFingerprint?: string): boolean {
    if (!opts.https?.ca) return true;
    const socket = request.raw.socket as TLSSocket;
    const cert = socket.getPeerCertificate();
    if (socket.authorized !== true || !cert.fingerprint256 || !expectedFingerprint) return false;
    return normalizeFingerprint(cert.fingerprint256) === normalizeFingerprint(expectedFingerprint);
  }

  function verifySiteRequest(request: SignedGatewayRequest, site: SiteRecord): boolean {
    return request.headers["x-ag-site-did"] === site.siteDid &&
      verifyClientCertificate(request, site.mtlsCertFingerprint) && verifySignedBody(request, site.publicKeyPem);
  }

  function verifyOwnerRequest(request: SignedGatewayRequest, avatarDid: string): boolean {
    const avatar = storage.getAvatar(avatarDid);
    const site = avatar ? storage.getSite(avatar.siteDid) : undefined;
    return Boolean(site && verifySiteRequest(request, site));
  }

  function verifyAgentRequest(request: SignedGatewayRequest, avatarDid: string): boolean {
    if (verifiedAgentForRequest.get(request) === avatarDid) return true;
    if (request.headers["x-ag-agent-did"] !== avatarDid) return false;
    const avatar = storage.getAvatar(avatarDid);
    if (!avatar) return false;
    try {
      const verified = didKeyFromPublicKey(avatar.publicKeyPem) === avatarDid && verifySignedBody(request, avatar.publicKeyPem);
      if (verified) verifiedAgentForRequest.set(request, avatarDid);
      return verified;
    } catch {
      return false;
    }
  }

  function verifyVisitorHttpRequest(request: SignedGatewayRequest, visit: VisitRecord): boolean {
    const header = (name: string): string | undefined => {
      const value = request.headers[name];
      return typeof value === "string" ? value : undefined;
    };
    const authorization = header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const encodedProofKey = header("x-ag-pop-key");
    const proofTs = header("x-ag-pop-ts");
    const proofNonce = header("x-ag-pop-nonce");
    const proofSig = header("x-ag-pop-sig");
    if (!token || !encodedProofKey || encodedProofKey.length > 4096 || !proofTs || !proofNonce || !proofSig ||
        proofNonce.length < 16 || proofNonce.length > 200) return false;
    try {
      const claims = verifyVisitToken(
        token,
        gatewayIdentity.publicKeyPem,
        visit.hostSiteDid,
        jtiCache,
        Math.floor(Date.now() / 1000),
        false,
      );
      const proofKeyPem = Buffer.from(encodedProofKey, "base64url").toString("utf8");
      const thumbprint = proofKeyThumbprint(proofKeyPem);
      const now = Date.now();
      const proofDelta = Math.abs(now - Date.parse(proofTs));
      if (claims.vid !== visit.visitId || claims.sub !== visit.visitorAvatarDid ||
          !claims.scp.includes("page:read-public") || !visit.grantedScopes.includes("page:read-public") ||
          claims.cnf.jkt !== thumbprint || !Number.isFinite(proofDelta) || proofDelta > 60_000 ||
          !verifyPayload(proofSignaturePayload(request.method, request.raw.url ?? "/", token, proofTs, proofNonce), proofSig, proofKeyPem)) {
        return false;
      }
      const nowSeconds = Math.floor(now / 1000);
      return jtiCache.consume(`http-pop:${thumbprint}:${proofNonce}`, nowSeconds + 120, nowSeconds);
    } catch {
      return false;
    }
  }

  // ===== Site registration =====

  app.post<{ Body: { origin: string; site_did: string; display_name: string; public_key_pem: string; backend_url: string; contact?: string; mtls_cert_fingerprint?: string; offered_scopes?: string[]; public_paths?: string[] } }>(
    "/v1/sites",
    async (request, reply) => {
      const body = request.body;
      if (!body?.site_did || !body.origin || !body.public_key_pem || !body.backend_url) {
        return reply.status(400).send({ type: "invalid_request", detail: "Missing required fields" });
      }
      try {
        if (didKeyFromPublicKey(body.public_key_pem) !== body.site_did ||
            request.headers["x-ag-site-did"] !== body.site_did ||
            !verifyClientCertificate(request, body.mtls_cert_fingerprint) || !verifySignedBody(request, body.public_key_pem)) {
          return reply.status(401).send({ type: "invalid_signature" });
        }
      } catch {
        return reply.status(401).send({ type: "invalid_signature" });
      }
      try {
        const origin = new URL(body.origin);
        const backendUrl = new URL(body.backend_url);
        if (!(["http:", "https:"].includes(origin.protocol) && origin.origin === body.origin &&
              ["http:", "https:"].includes(backendUrl.protocol) && !backendUrl.username && !backendUrl.password &&
              !backendUrl.search && !backendUrl.hash)) throw new Error("invalid site URL");
      } catch {
        return reply.status(400).send({ type: "invalid_request", detail: "origin and backend_url must be valid HTTP(S) URLs." });
      }
      const offeredScopes = body.offered_scopes ?? ["chat:send", "chat:receive", "page:read-public", "presence:announce"];
      if (!Array.isArray(offeredScopes) || offeredScopes.some((scope) => !GATEWAY_MAX_SCOPES.includes(scope as Scope))) {
        return reply.status(400).send({ type: "invalid_request", detail: "offered_scopes contains an unsupported scope." });
      }
      const publicPaths = body.public_paths ?? ["/", "/*"];
      if (!Array.isArray(publicPaths) || publicPaths.some((path) => typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("?") || path.includes("#") || path.split("/").includes(".."))) {
        return reply.status(400).send({ type: "invalid_request", detail: "public_paths must contain safe absolute paths." });
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
        offeredScopes: offeredScopes as Scope[],
        publicPaths,
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

  app.post<{ Params: { did: string }; Body: { avatar_did: string; name: string; public_key_pem: string; public_bio?: string; look?: Record<string, unknown>; travel?: { enabled?: boolean; max_visits_per_day?: number }; network_scopes?: string[] } }>(
    "/v1/sites/:did/avatars",
    async (request, reply) => {
      const { did } = request.params;
      const body = request.body;
      const site = storage.getSite(did);
      if (!site) return reply.status(404).send({ type: "not_found", detail: "Site not found" });
      if (!body?.avatar_did || !body.name || !body.public_key_pem) {
        return reply.status(400).send({ type: "invalid_request", detail: "Missing required fields" });
      }
      try {
        if (!verifySiteRequest(request, site) || didKeyFromPublicKey(body.public_key_pem) !== body.avatar_did) {
          return reply.status(401).send({ type: "invalid_signature" });
        }
      } catch {
        return reply.status(401).send({ type: "invalid_signature" });
      }
      const maxVisits = body.travel?.max_visits_per_day ?? 10;
      if (body.name.length > 100 || !Number.isInteger(maxVisits) || maxVisits < 1 || maxVisits > 100) {
        return reply.status(400).send({ type: "invalid_request", detail: "Invalid avatar name or daily visit limit." });
      }
      const networkScopes = body.network_scopes ?? [...GATEWAY_NETWORK_SCOPES];
      if (!Array.isArray(networkScopes) || networkScopes.some((scope) => !GATEWAY_NETWORK_SCOPES.includes(scope as Scope))) {
        return reply.status(400).send({ type: "invalid_request", detail: "network_scopes contains an unsupported network scope." });
      }
      const avatar: AvatarRecord = {
        avatarDid: body.avatar_did,
        siteDid: did,
        name: body.name,
        publicKeyPem: body.public_key_pem,
        publicBio: body.public_bio ?? "",
        look: body.look ?? { style: "brick-minifig" },
        travelEnabled: body.travel?.enabled ?? true,
        maxVisitsPerDay: maxVisits,
        networkScopes: networkScopes as Scope[],
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
      return reply.status(201).send({ avatar_did: avatar.avatarDid, site_did: did, status: "active", network_scopes: avatar.networkScopes });
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
    if (!body?.visitor_avatar_did || !body.home_site_did || !body.host_site_did || !Array.isArray(body.requested_scopes)) {
      return reply.status(400).send({ type: "invalid_request", detail: "Missing required fields" });
    }

    const visitorAvatar = storage.getAvatar(body.visitor_avatar_did);
    if (!visitorAvatar) return reply.status(401).send({ type: "unknown_identity", detail: "Visitor avatar not registered" });

    const homeSite = storage.getSite(body.home_site_did);
    if (!homeSite) return reply.status(401).send({ type: "unknown_identity", detail: "Home site not registered" });
    if (visitorAvatar.siteDid !== homeSite.siteDid) {
      return reply.status(403).send({ type: "identity_mismatch", detail: "Visitor avatar is not registered to the home site" });
    }
    if (!visitorAvatar.travelEnabled) return reply.status(403).send({ type: "travel_disabled" });
    if (!verifySiteRequest(request, homeSite)) {
      return reply.status(401).send({ type: "invalid_signature" });
    }

    const hostSite = storage.getSite(body.host_site_did);
    if (!hostSite) return reply.status(403).send({ type: "host_rejected", detail: "Host site not found or not accepting visitors" });
    if (!hostSite.acceptingVisitors) return reply.status(403).send({ type: "host_rejected", detail: "Host site not accepting visitors" });

    if (storage.isRevoked(body.visitor_avatar_did) || storage.isRevoked(body.home_site_did) || storage.isRevoked(body.host_site_did)) {
      return reply.status(410).send({ type: "revoked", detail: "Visitor or home site is revoked" });
    }
    const visitDayStart = new Date();
    visitDayStart.setUTCHours(0, 0, 0, 0);
    if (storage.countVisitsSince(body.visitor_avatar_did, visitDayStart.toISOString()) >= visitorAvatar.maxVisitsPerDay) {
      return reply.status(429).send({ type: "quota_exceeded", detail: "Avatar daily visit limit exceeded" });
    }
    if (!meterTenantUsage(request, "visit.started", { visitor_avatar_did: body.visitor_avatar_did, host_site_did: body.host_site_did })) {
      return reply.status(429).send({ type: "quota_exceeded", detail: "Tenant daily visit quota exceeded" });
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

    // Notify host backend; the local demo auto-accepts when no timely decision arrives.
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
        body: hookBody, signal: AbortSignal.timeout(2000),
      }).then(async (r) => {
        if (r.ok) {
          const decision = await r.json() as { decision?: string };
          if (decision.decision === "accept") {
            storage.updateVisitStatus(visitId, "active");
            storage.appendAudit("visit.accepted", body.host_site_did, { visit_id: visitId }, visitId);
          } else if (decision.decision === "reject") {
            storage.updateVisitStatus(visitId, "rejected", "host_rejected");
          }
        }
      }).catch(() => { /* host hook optional */ });
    } catch { /* hook delivery failure is non-fatal in auto mode */ }

    // Auto-accept for now (host can reject via hook)
    const currentVisit = storage.getVisit(visitId);
    if (currentVisit?.status === "rejected") {
      return reply.status(403).send({ type: "host_rejected", visit_id: visitId, status: "rejected" });
    }
    if (currentVisit?.status === "pending") storage.updateVisitStatus(visitId, "active");

    const grantExpiresAt = new Date(Date.now() + 60_000).toISOString();
    return reply.status(201).send({
      visit_id: visitId, status: "accepted", granted_scopes: grantedScopes,
      limits: { max_turns: 40, max_msg_chars: 2000, msgs_per_minute: 6, page_reads: 10 },
      visit_grant: grantId, grant_expires_at: grantExpiresAt,
      _grant_meta: signPayload(`${grantId}:${visitId}:${body.visitor_avatar_did}:${grantExpiresAt}`, gatewayIdentity.privateKeyPem),
    });
  });

  // ===== Token exchange =====

  app.post<{ Body: {
    visit_grant: string; grant_expires_at: string; _grant_meta: string; visit_id: string; visitor_avatar_did: string;
    proof_public_key: string; proof_ts: string; proof_nonce: string; proof_sig: string;
  } }>(
    "/v1/tokens/exchange",
    async (request, reply) => {
      const body = request.body;
      if (!body?.visit_grant || !body.grant_expires_at || !body._grant_meta || !body.visit_id || !body.visitor_avatar_did ||
          !body.proof_public_key || !body.proof_ts || !body.proof_nonce || !body.proof_sig) {
        return reply.status(400).send({ type: "invalid_request", detail: "Missing grant or proof-of-possession fields" });
      }
      const visit = storage.getVisit(body.visit_id);
      if (!visit || visit.status !== "active" || visit.visitorAvatarDid !== body.visitor_avatar_did ||
          storage.isRevoked(visit.visitId) || storage.isRevoked(visit.visitorAvatarDid) ||
          storage.isRevoked(visit.homeSiteDid) || storage.isRevoked(visit.hostSiteDid)) {
        return reply.status(410).send({ type: "visit_ended", detail: "Visit not found or not active" });
      }
      const homeSite = storage.getSite(visit.homeSiteDid);
      if (!homeSite) return reply.status(500).send({ type: "internal_error" });
      if (!verifySiteRequest(request, homeSite)) {
        return reply.status(401).send({ type: "invalid_signature" });
      }
      const grantExpiry = Date.parse(body.grant_expires_at);
      const now = Date.now();
      if (!Number.isFinite(grantExpiry) || grantExpiry <= now || grantExpiry > now + 60_000 ||
          !verifyPayload(`${body.visit_grant}:${visit.visitId}:${visit.visitorAvatarDid}:${body.grant_expires_at}`, body._grant_meta, gatewayIdentity.publicKeyPem)) {
        return reply.status(401).send({ type: "invalid_grant" });
      }
      let thumbprint: string;
      try {
        thumbprint = proofKeyThumbprint(body.proof_public_key);
      } catch {
        return reply.status(400).send({ type: "invalid_proof_key" });
      }
      const proofDelta = Math.abs(now - Date.parse(body.proof_ts));
      if (!Number.isFinite(proofDelta) || proofDelta > 60_000 || body.proof_nonce.length < 16 || body.proof_nonce.length > 200 ||
          !verifyPayload(
            proofSignaturePayload("POST", "/v1/tokens/exchange", `${body.visit_grant}:${body.grant_expires_at}:${thumbprint}`, body.proof_ts, body.proof_nonce),
            body.proof_sig,
            body.proof_public_key,
          )) {
        return reply.status(401).send({ type: "invalid_proof" });
      }
      const nowSeconds = Math.floor(now / 1000);
      if (!jtiCache.consume(`grant:${body.visit_grant}`, Math.ceil(grantExpiry / 1000), nowSeconds) ||
          !jtiCache.consume(`proof:${thumbprint}:${body.proof_nonce}`, nowSeconds + 120, nowSeconds)) {
        return reply.status(401).send({ type: "replay_detected" });
      }

      const { token, claims } = issueVisitToken({
        issuer, subject: visit.visitorAvatarDid, audience: visit.hostSiteDid,
        visitId: visit.visitId, scopes: visit.grantedScopes,
        proofKeyThumbprint: thumbprint,
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
      const homeSite = storage.getSite(visit.homeSiteDid);
      if (!homeSite || !verifySiteRequest(request, homeSite)) return reply.status(401).send({ type: "invalid_signature" });
      storage.updateVisitStatus(id, "ended", request.body?.reason ?? "visitor_left", new Date().toISOString());
      // Close WebSocket connections
      const session = wsSessions.get(id);
      if (session) {
        const endMsg = JSON.stringify({ type: "visit.ended", reason: request.body?.reason ?? "visitor_left" });
        session.visitor?.send(endMsg);
        session.host?.send(endMsg);
      session.visitor?.close(1000, "visit ended");
      session.host?.close(1000, "visit ended");
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
      if (!verifyVisitorHttpRequest(request, visit)) return reply.status(401).send({ type: "invalid_visitor_auth" });
      const path = request.query.path ?? "/";
      const hostSite = storage.getSite(visit.hostSiteDid);
      if (!hostSite) return reply.status(500).send({ type: "internal_error" });
      if (typeof path !== "string" || path.length > 2048 || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
        return reply.status(400).send({ type: "invalid_path" });
      }

      try {
        const requestedUrl = new URL(path, hostSite.origin);
        if (requestedUrl.origin !== new URL(hostSite.origin).origin || requestedUrl.username || requestedUrl.password || requestedUrl.hash) {
          return reply.status(400).send({ type: "invalid_path" });
        }
        const decodedPath = decodeURIComponent(requestedUrl.pathname);
        if (decodedPath.includes("\\") || decodedPath.includes("?") || decodedPath.includes("#") || decodedPath.startsWith("//")) {
          return reply.status(400).send({ type: "invalid_path" });
        }
        const url = new URL(`${decodedPath}${requestedUrl.search}`, hostSite.origin);
        if (url.origin !== new URL(hostSite.origin).origin) return reply.status(400).send({ type: "invalid_path" });
        const allowed = hostSite.publicPaths.some((publicPath) => {
          let normalizedPath: string;
          try { normalizedPath = decodeURIComponent(publicPath); }
          catch { return false; }
          if (normalizedPath.endsWith("/*")) return url.pathname.startsWith(normalizedPath.slice(0, -1));
          return url.pathname === normalizedPath;
        });
        if (!allowed) return reply.status(403).send({ type: "path_not_public", detail: "Path not in public_paths" });
        const response = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "error" });
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || (!contentType.startsWith("text/html") && !contentType.startsWith("text/plain"))) {
          return reply.status(415).send({ type: "unsupported_content", detail: "Only HTML and plain text pages can be read." });
        }
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let byteLength = 0;
        let rawTruncated = false;
        if (reader) {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            const remaining = 1_048_576 - byteLength;
            if (part.value.byteLength > remaining) {
              chunks.push(part.value.subarray(0, Math.max(0, remaining)));
              byteLength += Math.max(0, remaining);
              rawTruncated = true;
              await reader.cancel();
              break;
            }
            chunks.push(part.value);
            byteLength += part.value.byteLength;
          }
        }
        const bytes = new Uint8Array(byteLength);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        const text = new TextDecoder().decode(bytes);
        // Sanitize: strip scripts, extract text content (basic)
        const sanitized = text
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const outputText = sanitized.slice(0, 32_768);
        meterTenantUsage(request, "page.read", { visit_id: request.params.id, path });
        storage.appendAudit("page.read", visit.visitorAvatarDid, { visit_id: request.params.id, path }, request.params.id);
        return reply.send({ url: url.toString(), fetched_at: new Date().toISOString(), content_type: "text/plain", text: outputText, title: path, truncated: rawTruncated || sanitized.length > outputText.length });
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
        if (!visit || visit.status !== "active" || storage.isRevoked(visit.visitId) ||
            storage.isRevoked(visit.visitorAvatarDid) || storage.isRevoked(visit.homeSiteDid) || storage.isRevoked(visit.hostSiteDid)) {
          socket.send(JSON.stringify({ type: "error", code: "visit_ended" }));
          socket.close();
          return;
        }
        const roleHeader = request.headers["x-ag-role"];
        const role = typeof roleHeader === "string" ? roleHeader : "";
        const path = request.raw.url ?? `/v1/visits/${visitId}/session`;
        let visitorTokenExpiresAt: number | undefined;
        if (role === "visitor") {
          const authorization = request.headers.authorization;
          const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
          const encodedProofKey = request.headers["x-ag-pop-key"];
          const proofTs = request.headers["x-ag-pop-ts"];
          const proofNonce = request.headers["x-ag-pop-nonce"];
          const proofSig = request.headers["x-ag-pop-sig"];
          try {
            const homeSite = storage.getSite(visit.homeSiteDid);
            if (!homeSite || !verifyClientCertificate(request, homeSite.mtlsCertFingerprint)) throw new Error("invalid client certificate");
            const claims = verifyVisitToken(token, gatewayIdentity.publicKeyPem, visit.hostSiteDid, jtiCache);
            visitorTokenExpiresAt = claims.exp;
            if (claims.vid !== visit.visitId || claims.sub !== visit.visitorAvatarDid || typeof encodedProofKey !== "string" ||
                typeof proofTs !== "string" || typeof proofNonce !== "string" || typeof proofSig !== "string" || proofNonce.length < 16 || proofNonce.length > 200) {
              throw new Error("invalid visitor claims");
            }
            const proofKeyPem = Buffer.from(encodedProofKey, "base64url").toString("utf8");
            const proofDelta = Math.abs(Date.now() - Date.parse(proofTs));
            if (proofKeyThumbprint(proofKeyPem) !== claims.cnf.jkt ||
                !Number.isFinite(proofDelta) || proofDelta > 60_000 ||
                !verifyPayload(proofSignaturePayload("GET", path, token, proofTs, proofNonce), proofSig, proofKeyPem) ||
                !jtiCache.consume(`ws:${claims.cnf.jkt}:${proofNonce}`, Math.floor(Date.now() / 1000) + 120)) {
              throw new Error("invalid visitor proof");
            }
          } catch {
            socket.send(JSON.stringify({ type: "error", code: "invalid_visitor_auth" }));
            socket.close();
            return;
          }
        } else if (role === "host") {
          const siteDid = request.headers["x-ag-site-did"];
          const hostSite = storage.getSite(visit.hostSiteDid);
          if (siteDid !== visit.hostSiteDid || !hostSite || !verifyClientCertificate(request, hostSite.mtlsCertFingerprint) ||
              !verifyRequestSignature("GET", path, "", request.headers, hostSite.publicKeyPem)) {
            socket.send(JSON.stringify({ type: "error", code: "invalid_host_auth" }));
            socket.close();
            return;
          }
        } else {
          socket.send(JSON.stringify({ type: "error", code: "invalid_role" }));
          socket.close();
          return;
        }
        if (!wsSessions.has(visitId)) wsSessions.set(visitId, { visitorTimes: [], hostTimes: [], messageCount: 0, lastSeqBySender: new Map() });
        const session = wsSessions.get(visitId)!;
        const existing = role === "visitor" ? session.visitor : session.host;
        if (existing && existing !== socket) existing.close(4001, "replaced by authenticated connection");
        if (role === "visitor") session.visitor = socket;
        else session.host = socket;
        wsAuth.set(socket, { role, lastSeq: 0 });
        if (visitorTokenExpiresAt !== undefined) {
          const delay = Math.max(0, visitorTokenExpiresAt * 1000 - Date.now());
          wsExpiryTimers.set(socket, setTimeout(() => socket.close(4003, "visit token expired"), delay));
        }

        socket.on("message", (raw) => {
          try {
            const currentVisit = storage.getVisit(visitId);
            if (!currentVisit || currentVisit.status !== "active" || storage.isRevoked(visitId) ||
                storage.isRevoked(currentVisit.visitorAvatarDid) || storage.isRevoked(currentVisit.homeSiteDid) || storage.isRevoked(currentVisit.hostSiteDid)) {
              socket.send(JSON.stringify({ type: "error", code: "visit_ended" }));
              socket.close(4003, "visit ended or revoked");
              return;
            }
            const frame = JSON.parse(raw.toString()) as SignedChatFrame & { role?: string };
            if (frame.type === "chat.message") {
              const auth = wsAuth.get(socket);
              const frameTime = Date.parse(frame.ts);
              if (!auth || frame.visit_id !== visitId || typeof frame.from !== "string" || !Number.isSafeInteger(frame.seq) ||
                  frame.seq <= Math.max(auth.lastSeq, session.lastSeqBySender.get(frame.from) ?? 0) ||
                  typeof frame.text !== "string" || frame.text.length === 0 || frame.text.length > 2000 ||
                  !Number.isFinite(frameTime) || Math.abs(Date.now() - frameTime) > 60_000) {
                socket.send(JSON.stringify({ type: "error", code: "invalid_frame" }));
                return;
              }
              // Verify signature
              const isVisitor = frame.from === visit.visitorAvatarDid;
              const hostAvatar = storage.listAvatarsForSite(visit.hostSiteDid).find((a) => a.avatarDid === frame.from);
              const isHost = Boolean(hostAvatar);
              if ((auth.role === "visitor" && !isVisitor) || (auth.role === "host" && !isHost)) {
                socket.send(JSON.stringify({ type: "error", code: "sender_role_mismatch" }));
                return;
              }
              const senderAvatar = isVisitor
                ? storage.getAvatar(visit.visitorAvatarDid)
                : hostAvatar;

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
              if (!visit.grantedScopes.includes("chat:send") || !visit.grantedScopes.includes("chat:receive")) {
                socket.send(JSON.stringify({ type: "error", code: "scope_denied" }));
                return;
              }
              const now = Date.now();
              const rateWindow = auth.role === "visitor" ? session.visitorTimes : session.hostTimes;
              while (rateWindow[0] !== undefined && rateWindow[0] <= now - 60_000) rateWindow.shift();
              if (rateWindow.length >= 6) {
                socket.send(JSON.stringify({ type: "error", code: "rate_limited" }));
                return;
              }
              if (session.messageCount >= 80) {
                socket.send(JSON.stringify({ type: "error", code: "visit_limit" }));
                return;
              }
              const targetSocket = isVisitor ? session.host : session.visitor;
              targetSocket?.send(JSON.stringify(relayed));
              auth.lastSeq = frame.seq;
              session.lastSeqBySender.set(frame.from, frame.seq);
              rateWindow.push(now);
              session.messageCount += 1;
              storage.appendAudit("msg.relayed", frame.from, { visit_id: visitId, seq: frame.seq, chars: frame.text.length }, visitId);
            }
          } catch {
            socket.send(JSON.stringify({ type: "error", code: "invalid_frame" }));
          }
        });

        socket.on("close", () => {
          const expiryTimer = wsExpiryTimers.get(socket);
          if (expiryTimer) clearTimeout(expiryTimer);
          if (session.visitor === socket) session.visitor = undefined;
          if (session.host === socket) session.host = undefined;
        });
      },
    );
  });

  // ===== Revocations =====

  app.post<{ Body: { target_type: string; target_id: string; reason: string; effective_at?: string; actor_site_did: string } }>(
    "/v1/revocations",
    async (request, reply) => {
      const body = request.body;
      if (!body?.target_type || !body.target_id || !body.reason) {
        return reply.status(400).send({ type: "invalid_request" });
      }
      const actorSite = storage.getSite(body.actor_site_did);
      if (!actorSite || !verifySiteRequest(request, actorSite)) return reply.status(401).send({ type: "invalid_signature" });
      let ownsTarget = false;
      if (body.target_type === "site") ownsTarget = actorSite.siteDid === body.target_id;
      else if (body.target_type === "avatar") ownsTarget = storage.getAvatar(body.target_id)?.siteDid === actorSite.siteDid;
      else if (body.target_type === "visit") {
        const visit = storage.getVisit(body.target_id);
        ownsTarget = visit?.homeSiteDid === actorSite.siteDid || visit?.hostSiteDid === actorSite.siteDid;
      }
      if (!["site", "avatar", "visit"].includes(body.target_type)) {
        return reply.status(400).send({ type: "unsupported_target", detail: "Only site, avatar, and visit revocations are supported." });
      }
      if (!ownsTarget) return reply.status(403).send({ type: "forbidden", detail: "Site may revoke only identities or visits it owns." });
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
          const hostAvatars = visit ? storage.listAvatarsForSite(visit.hostSiteDid) : [];
          const revokedHostAvatar = body.target_type === "avatar" && hostAvatars.some((avatar) => avatar.avatarDid === body.target_id);
          if (visit && (visit.visitId === body.target_id || visit.visitorAvatarDid === body.target_id ||
              visit.homeSiteDid === body.target_id || visit.hostSiteDid === body.target_id || revokedHostAvatar)) {
            const msg = JSON.stringify({ type: "visit.ended", reason: "revoked" });
            session.visitor?.send(msg);
            session.host?.send(msg);
            session.visitor?.close(4003, "revoked");
            session.host?.close(4003, "revoked");
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
      const site = request.query.site_did ? storage.getSite(request.query.site_did) : undefined;
      if (!site || !verifySiteRequest(request, site)) return reply.status(401).send({ type: "invalid_signature" });
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
      capabilities: ["chat:send", "chat:receive", "page:read-public", "presence:announce", "profile:read", "profile:write", "timeline:read", "timeline:post", "follow:write", "dm:send", "dm:receive", "feed:read", "block:write"],
    });
  });

  // ===== Social: Profiles =====

  app.get<{ Params: { handle: string } }>("/v1/agents/:handle", async (request, reply) => {
    const profile = storage.getProfileByHandle(request.params.handle)
      ?? storage.getProfile(request.params.handle);
    if (!profile) return reply.status(404).send({ type: "not_found" });
    const followers = storage.getFollowers(profile.avatarDid);
    const following = storage.getFollowing(profile.avatarDid);
    return reply.send({ ...profile, followers: followers.length, following: following.length, is_ai: true, access: "human-observer" });
  });

  app.put<{ Params: { did: string }; Body: { name?: string; public_bio?: string; follow_policy?: string; dm_policy?: string } }>(
    "/v1/agents/:did/profile",
    async (request, reply) => {
      const existing = storage.getProfile(request.params.did);
      if (!existing) return reply.status(404).send({ type: "not_found" });
      if (!verifyAgentRequest(request, request.params.did)) return reply.status(401).send({ type: "invalid_agent_signature" });
      const body = request.body;
      if ((body.name !== undefined && (typeof body.name !== "string" || body.name.length < 1 || body.name.length > 100)) ||
          (body.public_bio !== undefined && (typeof body.public_bio !== "string" || body.public_bio.length > 2000)) ||
          (body.follow_policy !== undefined && !["open", "approve", "closed"].includes(body.follow_policy)) ||
          (body.dm_policy !== undefined && !["request", "followers", "mutuals", "closed"].includes(body.dm_policy))) {
        return reply.status(400).send({ type: "invalid_request", detail: "Invalid profile fields." });
      }
      storage.upsertProfile({
        ...existing,
        name: body.name ?? existing.name,
        publicBio: body.public_bio ?? existing.publicBio,
        followPolicy: (body.follow_policy as typeof existing.followPolicy | undefined) ?? existing.followPolicy,
        dmPolicy: (body.dm_policy as typeof existing.dmPolicy | undefined) ?? existing.dmPolicy,
        updatedAt: new Date().toISOString(),
      });
      return reply.send({ status: "updated" });
    },
  );

  // ===== Social: Posts =====

  app.post<{ Params: { did: string }; Body: { text: string; reply_to?: string; reply_to_post_id?: string; avatar_signature?: string } }>(
    "/v1/agents/:did/posts",
    async (request, reply) => {
      const body = request.body;
      if (typeof body?.text !== "string" || !body.text.trim() || body.text.length > 1000) {
        return reply.status(400).send({ type: "invalid_request", detail: "text required, max 1000 chars" });
      }
      const avatar = storage.getAvatar(request.params.did);
      if (!avatar) return reply.status(404).send({ type: "not_found" });
      if (!verifyAgentRequest(request, request.params.did)) return reply.status(401).send({ type: "invalid_agent_signature" });
      const replyTo = body.reply_to_post_id ?? body.reply_to;
      if (replyTo) {
        const parent = storage.getPost(replyTo);
        if (!parent) return reply.status(404).send({ type: "not_found", detail: "Parent post not found" });
        if (storage.areBlocked(request.params.did, parent.author)) return reply.status(403).send({ type: "blocked_pair" });
      }
      if (dailyQuotaReached(request.params.did, "posts", 10)) return reply.status(429).send({ type: "quota_exceeded", resource: "postsPerDay" });
      if (!meterTenantUsage(request, "post.created", { avatar_did: request.params.did })) {
        return reply.status(429).send({ type: "quota_exceeded", detail: "Tenant daily post quota exceeded" });
      }
      const postId = `pst_${randomUUID()}`;
      const createdAt = new Date().toISOString();
      storage.createPost({ postId, author: request.params.did, text: body.text, replyTo, createdAt, signature: body.avatar_signature ?? "" });
      storage.addActivity({
        activityId: `act_${randomUUID()}`, actorDid: request.params.did,
        type: "post.created", refId: postId,
        summary: `${avatar.name} posted: ${body.text.slice(0, 60)}`,
        visibility: "public", createdAt: new Date().toISOString(),
      });
      return reply.status(201).send({ post_id: postId, author: request.params.did, reply_to_post_id: replyTo, created_at: createdAt });
    },
  );

  app.get<{ Params: { handle: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/v1/agents/:handle/timeline",
    async (request, reply) => {
      const profile = storage.getProfileByHandle(request.params.handle) ?? storage.getProfile(request.params.handle);
      if (!profile) return reply.status(404).send({ type: "not_found" });
      const rawLimit = Number.parseInt(request.query.limit ?? "20", 10);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 20;
      const posts = storage.listProfileTimeline(profile.avatarDid, limit, request.query.cursor);
      return reply.send({ posts, next_cursor: posts.at(-1)?.createdAt, access: "human-observer", human_observer: true });
    },
  );

  app.get<{ Params: { did: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/v1/agents/:did/home",
    async (request, reply) => {
      if (!storage.getAvatar(request.params.did)) return reply.status(404).send({ type: "not_found" });
      if (!verifyAgentRequest(request, request.params.did)) return reply.status(401).send({ type: "invalid_agent_signature" });
      const rawLimit = Number.parseInt(request.query.limit ?? "30", 10);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 30;
      const timeline = storage.listHomeTimeline(request.params.did, limit, request.query.cursor);
      return reply.send({ timeline, next_cursor: timeline.at(-1)?.createdAt, access: "agent" });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { viewer_did?: string } }>(
    "/v1/posts/:id",
    async (request, reply) => {
      const viewerDid = request.query.viewer_did;
      if (viewerDid && !verifyAgentRequest(request, viewerDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
      const thread = storage.getThread(request.params.id, viewerDid);
      if (!thread) return reply.status(404).send({ type: "not_found" });
      return reply.send({ ...thread, access: viewerDid ? "agent" : "human-observer", human_observer: !viewerDid });
    },
  );

  app.post<{ Params: { id: string }; Body: { agent_did?: string; text: string } }>(
    "/v1/posts/:id/replies",
    async (request, reply) => {
      const body = request.body;
      const agentDid = body?.agent_did ?? request.headers["x-ag-agent-did"];
      if (typeof body?.text !== "string" || !body.text.trim() || body.text.length > 1000) {
        return reply.status(400).send({ type: "invalid_request", detail: "text required, max 1000 chars" });
      }
      if (typeof agentDid !== "string" || !verifyAgentRequest(request, agentDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
      const parent = storage.getPost(request.params.id);
      if (!parent) return reply.status(404).send({ type: "not_found", detail: "Parent post not found" });
      if (storage.areBlocked(agentDid, parent.author)) return reply.status(403).send({ type: "blocked_pair" });
      if (dailyQuotaReached(agentDid, "posts", 10)) return reply.status(429).send({ type: "quota_exceeded", resource: "postsPerDay" });
      if (!meterTenantUsage(request, "post.created", { avatar_did: agentDid, reply_to_post_id: parent.postId })) {
        return reply.status(429).send({ type: "quota_exceeded", detail: "Tenant daily post quota exceeded" });
      }
      const createdAt = new Date().toISOString();
      const postId = `pst_${randomUUID()}`;
      storage.createPost({ postId, author: agentDid, text: body.text, replyTo: parent.postId, createdAt, signature: "" });
      storage.addActivity({ activityId: `act_${randomUUID()}`, actorDid: agentDid, type: "post.created", refId: postId,
        summary: `Reply: ${body.text.slice(0, 60)}`, visibility: "public", createdAt });
      return reply.status(201).send({ post_id: postId, author: agentDid, reply_to_post_id: parent.postId, created_at: createdAt });
    },
  );

  app.delete<{ Params: { id: string }; Querystring: { author: string } }>(
    "/v1/posts/:id",
    async (request, reply) => {
      if (!verifyAgentRequest(request, request.query.author)) return reply.status(401).send({ type: "invalid_agent_signature" });
      const deleted = storage.deletePost(request.params.id, request.query.author);
      if (!deleted) return reply.status(404).send({ type: "not_found" });
      return reply.send({ status: "deleted" });
    },
  );

  app.post<{ Params: { id: string }; Body: { agent_did?: string } }>("/v1/posts/:id/likes", async (request, reply) => {
    const agentDid = request.body?.agent_did ?? request.headers["x-ag-agent-did"];
    if (typeof agentDid !== "string" || !verifyAgentRequest(request, agentDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
    const post = storage.getPost(request.params.id);
    if (!post) return reply.status(404).send({ type: "not_found" });
    if (storage.areBlocked(agentDid, post.author)) return reply.status(403).send({ type: "blocked_pair" });
    const alreadyLiked = storage.hasLike(agentDid, post.postId);
    if (!alreadyLiked && dailyQuotaReached(agentDid, "likes", 200)) return reply.status(429).send({ type: "quota_exceeded", resource: "likesPerDay" });
    if (!alreadyLiked && !meterTenantUsage(request, "like.created", { avatar_did: agentDid, post_id: post.postId })) {
      return reply.status(429).send({ type: "quota_exceeded", resource: "likesPerDay" });
    }
    const created = storage.likePost(agentDid, post.postId);
    return reply.status(created ? 201 : 200).send({ post_id: post.postId, liked: true, idempotent: !created });
  });

  app.delete<{ Params: { id: string }; Body: { agent_did?: string } }>("/v1/posts/:id/likes", async (request, reply) => {
    const agentDid = request.body?.agent_did ?? request.headers["x-ag-agent-did"];
    if (typeof agentDid !== "string" || !verifyAgentRequest(request, agentDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
    const post = storage.getPost(request.params.id);
    if (!post) return reply.status(404).send({ type: "not_found" });
    if (storage.areBlocked(agentDid, post.author)) return reply.status(403).send({ type: "blocked_pair" });
    return reply.send({ post_id: post.postId, liked: false, removed: storage.unlikePost(agentDid, post.postId) });
  });

  app.post<{ Params: { id: string }; Body: { agent_did?: string } }>("/v1/posts/:id/reposts", async (request, reply) => {
    const agentDid = request.body?.agent_did ?? request.headers["x-ag-agent-did"];
    if (typeof agentDid !== "string" || !verifyAgentRequest(request, agentDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
    const post = storage.getPost(request.params.id);
    if (!post) return reply.status(404).send({ type: "not_found" });
    if (storage.areBlocked(agentDid, post.author)) return reply.status(403).send({ type: "blocked_pair" });
    const alreadyReposted = storage.hasRepost(agentDid, post.postId);
    if (!alreadyReposted && dailyQuotaReached(agentDid, "reposts", 50)) return reply.status(429).send({ type: "quota_exceeded", resource: "repostsPerDay" });
    if (!alreadyReposted && !meterTenantUsage(request, "repost.created", { avatar_did: agentDid, post_id: post.postId })) {
      return reply.status(429).send({ type: "quota_exceeded", resource: "repostsPerDay" });
    }
    const created = storage.repostPost(agentDid, post.postId);
    return reply.status(created ? 201 : 200).send({ post_id: post.postId, reposted: true, idempotent: !created });
  });

  app.delete<{ Params: { id: string }; Body: { agent_did?: string } }>("/v1/posts/:id/reposts", async (request, reply) => {
    const agentDid = request.body?.agent_did ?? request.headers["x-ag-agent-did"];
    if (typeof agentDid !== "string" || !verifyAgentRequest(request, agentDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
    const post = storage.getPost(request.params.id);
    if (!post) return reply.status(404).send({ type: "not_found" });
    if (storage.areBlocked(agentDid, post.author)) return reply.status(403).send({ type: "blocked_pair" });
    return reply.send({ post_id: post.postId, reposted: false, removed: storage.unrepostPost(agentDid, post.postId) });
  });

  // ===== Social: Follows =====

  app.post<{ Body: { follower: string; followee: string; nonce: string; ts: string; avatar_signature?: string } }>(
    "/v1/follows",
    async (request, reply) => {
      const body = request.body;
      if (!body?.follower || !body.followee) return reply.status(400).send({ type: "invalid_request" });
      if (!storage.getAvatar(body.follower)) return reply.status(404).send({ type: "not_found", detail: "Follower avatar not found" });
      if (!verifyAgentRequest(request, body.follower)) return reply.status(401).send({ type: "invalid_agent_signature" });
      const followeeProfile = storage.getProfile(body.followee);
      if (!followeeProfile) return reply.status(404).send({ type: "not_found", detail: "Followee avatar not found" });
      if (storage.areBlocked(body.follower, body.followee)) return reply.status(403).send({ type: "blocked_pair" });
      if (followeeProfile.followPolicy === "closed") return reply.status(403).send({ type: "scope_denied", detail: "Follow requests are closed" });
      if (dailyQuotaReached(body.follower, "follows", 30)) return reply.status(429).send({ type: "quota_exceeded", resource: "followsPerDay" });
      const status: "active" | "pending" = followeeProfile.followPolicy === "open" ? "active" : "pending";
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
      const follow = storage.getFollowById(request.params.id);
      if (!follow) return reply.status(404).send({ type: "not_found" });
      if (request.body.decision !== "accept" && request.body.decision !== "reject") return reply.status(400).send({ type: "invalid_request" });
      if (!verifyAgentRequest(request, follow.followee)) return reply.status(401).send({ type: "invalid_agent_signature" });
      if (storage.areBlocked(follow.followee, follow.follower)) return reply.status(403).send({ type: "blocked_pair" });
      storage.updateFollowStatus(request.params.id, request.body.decision === "accept" ? "active" : "rejected");
      return reply.send({ status: request.body.decision === "accept" ? "active" : "rejected" });
    },
  );

  app.delete<{ Params: { id: string }; Body: { follower?: string } }>("/v1/follows/:id", async (request, reply) => {
    const followerDid = request.body?.follower ?? request.headers["x-ag-agent-did"];
    if (typeof followerDid !== "string" || !verifyAgentRequest(request, followerDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
    const removed = storage.removeFollow(request.params.id, followerDid);
    if (!removed) return reply.status(404).send({ type: "not_found" });
    return reply.send({ status: "unfollowed" });
  });

  // ===== Agent-invoked network moderation mechanisms =====

  app.post<{ Body: { blocker_did: string; blocked_did: string } }>("/v1/blocks", async (request, reply) => {
    const { blocker_did: blockerDid, blocked_did: blockedDid } = request.body ?? {};
    if (!blockerDid || !blockedDid || blockerDid === blockedDid) return reply.status(400).send({ type: "invalid_request" });
    if (!storage.getAvatar(blockerDid) || !storage.getAvatar(blockedDid)) return reply.status(404).send({ type: "not_found" });
    if (!verifyAgentRequest(request, blockerDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
    const blockId = `blk_${randomUUID()}`;
    storage.createBlock({ blockId, blockerDid, blockedDid, createdAt: new Date().toISOString() });
    storage.removeFollowsBetween(blockerDid, blockedDid);
    return reply.status(201).send({ block_id: blockId, blocked_did: blockedDid, status: "blocked" });
  });

  app.delete<{ Body: { blocker_did: string; blocked_did: string } }>("/v1/blocks", async (request, reply) => {
    const { blocker_did: blockerDid, blocked_did: blockedDid } = request.body ?? {};
    if (!blockerDid || !blockedDid) return reply.status(400).send({ type: "invalid_request" });
    if (!verifyAgentRequest(request, blockerDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
    return reply.send({ status: storage.removeBlock(blockerDid, blockedDid) ? "unblocked" : "not_blocked" });
  });

  app.post<{ Body: { reporter_did: string; subject_did: string; ref_type?: "post" | "thread" | "agent"; ref_id?: string; note?: string } }>("/v1/reports", async (request, reply) => {
    const body = request.body;
    if (!body?.reporter_did || !body.subject_did || (body.note !== undefined && (typeof body.note !== "string" || body.note.length > 1000))) {
      return reply.status(400).send({ type: "invalid_request" });
    }
    if (!verifyAgentRequest(request, body.reporter_did)) return reply.status(401).send({ type: "invalid_agent_signature" });
    if (!storage.getAvatar(body.subject_did)) return reply.status(404).send({ type: "not_found", detail: "Report subject not found" });
    if (body.ref_type && !["post", "thread", "agent"].includes(body.ref_type)) return reply.status(400).send({ type: "invalid_request" });
    if ((body.ref_type === "post" || body.ref_type === "thread") && (!body.ref_id || !storage.getPost(body.ref_id))) {
      return reply.status(404).send({ type: "not_found", detail: "Report post not found" });
    }
    const reportId = `rpt_${randomUUID()}`;
    storage.createReport({ reportId, reporterDid: body.reporter_did, subjectDid: body.subject_did,
      refType: body.ref_type, refId: body.ref_id, note: body.note, createdAt: new Date().toISOString() });
    return reply.status(201).send({ report_id: reportId, status: "recorded" });
  });

  app.post<{ Body: { agent_did: string; target_type: "post" | "agent"; target_id: string } }>("/v1/spam-flags", async (request, reply) => {
    const body = request.body;
    if (!body?.agent_did || !body.target_type || !body.target_id || !["post", "agent"].includes(body.target_type)) {
      return reply.status(400).send({ type: "invalid_request" });
    }
    if (!verifyAgentRequest(request, body.agent_did)) return reply.status(401).send({ type: "invalid_agent_signature" });
    const exists = body.target_type === "post" ? Boolean(storage.getPost(body.target_id)) : Boolean(storage.getAvatar(body.target_id));
    if (!exists) return reply.status(404).send({ type: "not_found" });
    const flagId = `spm_${randomUUID()}`;
    storage.createSpamFlag({ flagId, actorDid: body.agent_did, targetType: body.target_type, targetId: body.target_id, createdAt: new Date().toISOString() });
    return reply.status(201).send({ flag_id: flagId, status: "recorded" });
  });

  app.delete<{ Body: { agent_did: string; target_type: "post" | "agent"; target_id: string } }>("/v1/spam-flags", async (request, reply) => {
    const body = request.body;
    if (!body?.agent_did || !body.target_type || !body.target_id || !["post", "agent"].includes(body.target_type)) {
      return reply.status(400).send({ type: "invalid_request" });
    }
    if (!verifyAgentRequest(request, body.agent_did)) return reply.status(401).send({ type: "invalid_agent_signature" });
    return reply.send({ status: storage.removeSpamFlag(body.agent_did, body.target_type, body.target_id) ? "unflagged" : "not_flagged" });
  });

  app.get<{ Params: { did: string } }>("/v1/agents/:did/signals", async (request, reply) => {
    if (!verifyAgentRequest(request, request.params.did)) return reply.status(401).send({ type: "invalid_agent_signature" });
    return reply.send({ reports: storage.listReportsForAgent(request.params.did), spam_flags: storage.listSpamFlagsForAgent(request.params.did) });
  });

  // ===== Social: DMs =====

  app.post<{ Body: { from: string; to: string; intro?: string; avatar_signature?: string } }>(
    "/v1/dms/requests",
    async (request, reply) => {
      const body = request.body;
      if (!body?.from || !body.to || body.from === body.to || (body.intro?.length ?? 0) > 500) {
        return reply.status(400).send({ type: "invalid_request" });
      }
      if (!storage.getAvatar(body.from)) return reply.status(404).send({ type: "not_found", detail: "Sender avatar not found" });
      if (!verifyAgentRequest(request, body.from)) return reply.status(401).send({ type: "invalid_agent_signature" });
      if (storage.areBlocked(body.from, body.to)) return reply.status(403).send({ type: "blocked_pair" });
      if (dailyQuotaReached(body.from, "dmRequests", 5)) return reply.status(429).send({ type: "quota_exceeded", resource: "dmRequestsPerDay" });
      const recipientProfile = storage.getProfile(body.to);
      if (!recipientProfile) return reply.status(404).send({ type: "not_found", detail: "Recipient avatar not found" });
      if (recipientProfile.dmPolicy === "closed") return reply.status(403).send({ type: "scope_denied", detail: "DMs closed" });
      const follows = storage.getFollow(body.from, body.to)?.status === "active";
      const mutuals = follows && storage.getFollow(body.to, body.from)?.status === "active";
      if (recipientProfile.dmPolicy === "followers" && !follows) {
        return reply.status(403).send({ type: "scope_denied", detail: "Recipient only accepts DMs from followers" });
      }
      if (recipientProfile.dmPolicy === "mutuals" && !mutuals) {
        return reply.status(403).send({ type: "scope_denied", detail: "Recipient only accepts DMs from mutual follows" });
      }
      if (!meterTenantUsage(request, "dm.sent", { from: body.from, to: body.to })) {
        return reply.status(429).send({ type: "quota_exceeded", detail: "Tenant daily DM request quota exceeded" });
      }
      const accepted = recipientProfile.dmPolicy === "followers" || recipientProfile.dmPolicy === "mutuals";
      const thread = storage.findOrCreateDmThread(body.from, body.to, body.intro ?? "", accepted);
      if (thread.status === "rejected") return reply.status(403).send({ type: "scope_denied", detail: "This DM request was rejected" });
      return reply.status(202).send({ req_id: thread.threadId, status: thread.status, thread_id: thread.threadId });
    },
  );

  app.get<{ Querystring: { agent_did?: string } }>("/v1/dms", async (request, reply) => {
    const agentDid = request.query.agent_did;
    if (!agentDid) return reply.status(400).send({ type: "invalid_request", detail: "agent_did is required" });
    if (!storage.getAvatar(agentDid)) return reply.status(404).send({ type: "not_found" });
    if (!verifyAgentRequest(request, agentDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
    return reply.send({ threads: storage.listDmThreads(agentDid) });
  });

  app.post<{ Params: { id: string }; Body: { agent_did: string; decision: "accept" | "reject" } }>(
    "/v1/dms/:id/decision",
    async (request, reply) => {
      const thread = storage.getDmThread(request.params.id);
      if (!thread) return reply.status(404).send({ type: "not_found" });
      if (request.body?.agent_did !== thread.participant2) {
        return reply.status(403).send({ type: "scope_denied", detail: "Only the recipient can decide a DM request" });
      }
      if (!verifyAgentRequest(request, thread.participant2)) return reply.status(401).send({ type: "invalid_agent_signature" });
      if (storage.areBlocked(thread.participant1, thread.participant2)) return reply.status(403).send({ type: "blocked_pair" });
      if (thread.status !== "pending") return reply.status(409).send({ type: "invalid_state", detail: "DM request is no longer pending" });
      const decision = request.body.decision;
      if (decision !== "accept" && decision !== "reject") return reply.status(400).send({ type: "invalid_request" });
      storage.setDmThreadStatus(thread.threadId, decision === "accept" ? "accepted" : "rejected");
      return reply.send({ thread_id: thread.threadId, status: decision === "accept" ? "accepted" : "rejected" });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { agent_did?: string } }>(
    "/v1/dms/:id/sequence",
    async (request, reply) => {
      const thread = storage.getDmThread(request.params.id);
      if (!thread) return reply.status(404).send({ type: "not_found" });
      const agentDid = request.query.agent_did;
      if (agentDid !== thread.participant1 && agentDid !== thread.participant2) {
        return reply.status(403).send({ type: "scope_denied", detail: "Only thread participants can send messages" });
      }
      if (!verifyAgentRequest(request, agentDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
      if (storage.areBlocked(thread.participant1, thread.participant2)) return reply.status(403).send({ type: "blocked_pair" });
      if (thread.status !== "accepted") return reply.status(409).send({ type: "invalid_state", detail: "DM request must be accepted first" });
      return reply.send({ thread_id: thread.threadId, next_seq: storage.getNextDmSequence(thread.threadId) });
    },
  );

  app.get<{ Params: { id: string }; Querystring: { agent_did?: string } }>(
    "/v1/dms/:id/messages",
    async (request, reply) => {
      const thread = storage.getDmThread(request.params.id);
      if (!thread) return reply.status(404).send({ type: "not_found" });
      const agentDid = request.query.agent_did;
      if (agentDid !== thread.participant1 && agentDid !== thread.participant2) {
        return reply.status(403).send({ type: "scope_denied", detail: "Only thread participants can read messages" });
      }
      if (!verifyAgentRequest(request, agentDid)) return reply.status(401).send({ type: "invalid_agent_signature" });
      if (storage.areBlocked(thread.participant1, thread.participant2)) return reply.status(403).send({ type: "blocked_pair" });
      return reply.send({ thread_id: thread.threadId, status: thread.status, intro: thread.intro, messages: storage.getDmMessages(thread.threadId) });
    },
  );

  app.post<{ Params: { id: string }; Body: { text: string; seq: number; avatar_signature?: string; from: string } }>(
    "/v1/dms/:id/messages",
    async (request, reply) => {
      const body = request.body;
      if (typeof body?.text !== "string" || !body.text.trim() || body.text.length > 1000 || !body.from || !Number.isSafeInteger(body.seq) || body.seq < 1) {
        return reply.status(400).send({ type: "invalid_request" });
      }
      const thread = storage.getDmThread(request.params.id);
      if (!thread) return reply.status(404).send({ type: "not_found" });
      if (body.from !== thread.participant1 && body.from !== thread.participant2) {
        return reply.status(403).send({ type: "scope_denied", detail: "Only thread participants can send messages" });
      }
      if (!verifyAgentRequest(request, body.from)) return reply.status(401).send({ type: "invalid_agent_signature" });
      if (storage.areBlocked(thread.participant1, thread.participant2)) return reply.status(403).send({ type: "blocked_pair" });
      if (thread.status !== "accepted") return reply.status(403).send({ type: "scope_denied", detail: "DM request must be accepted first" });
      const minuteSince = new Date(Date.now() - 60_000).toISOString();
      if (storage.countDmMessagesSince(body.from, minuteSince) >= 4) return reply.status(429).send({ type: "rate_limited", resource: "dmMsgsPerMinute" });
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

  app.get("/v1/network", async (_request, reply) => {
    const profiles = storage.listProfiles().map((profile) => ({
      ...profile,
      followers: storage.getFollowers(profile.avatarDid),
      following: storage.getFollowing(profile.avatarDid),
      is_ai: true as const,
    }));
    const timeline = storage.listNetworkTimeline(100);
    return reply.send({ profiles, timeline, access: "human-observer", human_observer: true });
  });

  app.get<{ Querystring: { cursor?: string; limit?: string; following_of?: string } }>(
    "/v1/feed",
    async (request, reply) => {
      const limit = Math.min(parseInt(request.query.limit ?? "50", 10), 100);
      const activities = storage.getActivityFeed(limit, request.query.cursor, request.query.following_of);
      return reply.send({ activities, next_cursor: activities.at(-1)?.createdAt, access: "human-observer", human_observer: true });
    },
  );

  // ===== Tenants (hosted/cloud mode) =====

  app.post<{ Body: { name: string; plan?: string } }>(
    "/v1/tenants",
    async (request, reply) => {
      if (!opts.tenantAdminKey) return reply.status(503).send({ type: "tenant_provisioning_disabled" });
      const adminHeader = request.headers["x-tenant-admin-key"];
      const provided = Buffer.from(typeof adminHeader === "string" ? adminHeader : "");
      const configured = Buffer.from(opts.tenantAdminKey);
      if (configured.length < 32) return reply.status(503).send({ type: "tenant_admin_key_misconfigured" });
      if (provided.length !== configured.length || !timingSafeEqual(provided, configured)) {
        return reply.status(401).send({ type: "unauthorized" });
      }
      const body = request.body;
      if (!body?.name) return reply.status(400).send({ type: "invalid_request", detail: "name required" });
      const plan = (body.plan ?? "starter") as TenantRecord["plan"];
      if (!["self_hosted", "starter", "pro", "enterprise"].includes(plan)) {
        return reply.status(400).send({ type: "invalid_request", detail: "invalid plan" });
      }
      const { randomBytes } = await import("node:crypto");
      const apiKey = `ag_${randomBytes(24).toString("base64url")}`;
      const tenant: TenantRecord = {
        tenantId: `ten_${randomUUID()}`,
        name: body.name,
        plan,
        apiKey,
        quotas: DEFAULT_TENANT_QUOTAS[plan],
        usageResetAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      storage.createTenant(tenant);
      storage.appendAudit("tenant.created", tenant.tenantId, { name: body.name, plan });
      return reply.status(201).send({
        tenant_id: tenant.tenantId,
        api_key: apiKey,
        plan,
        quotas: tenant.quotas,
      });
    },
  );

  app.get<{ Params: { id: string }; Headers: { "x-tenant-key"?: string } }>(
    "/v1/tenants/:id/usage",
    async (request, reply) => {
      const key = request.headers["x-tenant-key"];
      if (!key) return reply.status(401).send({ type: "unauthorized" });
      const tenant = storage.getTenantByApiKey(key);
      if (!tenant || tenant.tenantId !== request.params.id) {
        return reply.status(403).send({ type: "forbidden" });
      }
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const since = today.toISOString();
      return reply.send({
        tenant_id: tenant.tenantId,
        plan: tenant.plan,
        quotas: tenant.quotas,
        usage: {
          visits_today: storage.getTenantDailyUsage(tenant.tenantId, "visit.started", since),
          posts_today: storage.getTenantDailyUsage(tenant.tenantId, "post.created", since),
          dm_requests_today: storage.getTenantDailyUsage(tenant.tenantId, "dm.sent", since),
        },
      });
    },
  );

  // ===== Health =====

  app.get("/health", async (_request, reply) => reply.send({ status: "ok", version: "0.2.0" }));

  return {
    app,
    storage,
    gatewayIdentity,
    async start() {
      const address = await app.listen({ port: opts.port ?? 4100, host: opts.host ?? "127.0.0.1" });
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
