import { randomUUID, createHash } from "node:crypto";
import type { Scope } from "./policy.js";
import { createSqlJsDatabase, type StorageDatabase } from "./sqlite.js";

export interface SiteRecord {
  siteDid: string;
  origin: string;
  displayName: string;
  publicKeyPem: string;
  backendUrl: string;
  contact: string;
  mtlsCertFingerprint: string;
  acceptingVisitors: boolean;
  offeredScopes: Scope[];
  publicPaths: string[];
  createdAt: string;
}

export interface AvatarRecord {
  avatarDid: string;
  siteDid: string;
  name: string;
  publicKeyPem: string;
  publicBio: string;
  look: Record<string, unknown>;
  travelEnabled: boolean;
  maxVisitsPerDay: number;
  networkScopes?: Scope[];
  createdAt: string;
}

export interface VisitRecord {
  visitId: string;
  visitorAvatarDid: string;
  homeSiteDid: string;
  hostSiteDid: string;
  grantedScopes: Scope[];
  status: "pending" | "active" | "ended" | "rejected";
  reason?: string;
  createdAt: string;
  endedAt?: string;
}

export interface AuditEvent {
  id: string;
  ts: string;
  type: string;
  visitId?: string;
  actor: string;
  details: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface RevocationRecord {
  revocationId: string;
  targetType: "key" | "avatar" | "site" | "visit" | "token";
  targetId: string;
  reason: string;
  effectiveAt: string;
}

// Social types
export interface ProfileRecord {
  avatarDid: string;
  handle: string;
  name: string;
  publicBio: string;
  homeOrigin: string;
  followPolicy: "open" | "approve" | "closed";
  dmPolicy: "followers" | "mutuals" | "request" | "closed";
  updatedAt: string;
}

export interface PostRecord {
  postId: string;
  author: string;
  text: string;
  replyTo?: string;
  createdAt: string;
  signature: string;
}

export interface SocialPostRecord extends PostRecord {
  likeCount: number;
  repostCount: number;
  likedByMe?: boolean;
  repostedByMe?: boolean;
}

export interface TimelineEntry {
  kind: "post" | "repost";
  actorDid: string;
  createdAt: string;
  post: SocialPostRecord;
}

export interface BlockRecord {
  blockId: string;
  blockerDid: string;
  blockedDid: string;
  createdAt: string;
}

export interface ReportRecord {
  reportId: string;
  reporterDid: string;
  subjectDid: string;
  refType?: "post" | "thread" | "agent";
  refId?: string;
  note?: string;
  createdAt: string;
}

export interface SpamFlagRecord {
  flagId: string;
  actorDid: string;
  targetType: "post" | "agent";
  targetId: string;
  createdAt: string;
}

export interface FollowRecord {
  followId: string;
  follower: string;
  followee: string;
  status: "active" | "pending" | "rejected";
  createdAt: string;
}

export interface DmThreadRecord {
  threadId: string;
  participant1: string;
  participant2: string;
  status: "pending" | "accepted" | "rejected";
  intro: string;
  createdAt: string;
}

export interface DmMessageRecord {
  messageId: string;
  threadId: string;
  from: string;
  text: string;
  seq: number;
  createdAt: string;
  signature: string;
}

export interface ActivityRecord {
  activityId: string;
  actorDid: string;
  type: "visit.completed" | "post.created" | "follow.created" | "agent.joined";
  refId: string;
  summary: string;
  visibility: "public" | "private";
  createdAt: string;
}

// ── Tenant / hosted-mode types ───────────────────────────────────────────

export type TenantPlan = "self_hosted" | "starter" | "pro" | "enterprise";

export interface TenantQuotas {
  maxSites: number;
  maxAvatars: number;
  visitsPerDay: number;
  postsPerDay: number;
  likesPerDay: number;
  repostsPerDay: number;
  dmRequestsPerDay: number;
  apiCallsPerMinute: number;
}

export interface TenantRecord {
  tenantId: string;
  name: string;
  plan: TenantPlan;
  apiKey: string;          // hashed SHA-256 hex before storage
  quotas: TenantQuotas;
  usageResetAt: string;    // ISO — daily reset timestamp
  createdAt: string;
}

export interface UsageMeteringEvent {
  tenantId: string;
  eventType: "visit.started" | "post.created" | "like.created" | "repost.created" | "dm.sent" | "api.call" | "page.read";
  quantity: number;
  ts: string;
  metadata?: Record<string, unknown>;
}

/** Pluggable billing adapter interface — no payment provider hard-wired. */
export interface BillingAdapter {
  /** Called when metered usage is recorded. Implementations may batch. */
  onUsage(event: UsageMeteringEvent): Promise<void>;
  /** Returns true if the tenant is entitled to perform the requested action. */
  checkEntitlement(tenantId: string, resource: string): Promise<boolean>;
  /** Called when a tenant's plan changes. */
  onPlanChange(tenantId: string, newPlan: TenantPlan): Promise<void>;
}

export const DEFAULT_TENANT_QUOTAS: Record<TenantPlan, TenantQuotas> = {
  self_hosted:  { maxSites: 999, maxAvatars: 999, visitsPerDay: 9999, postsPerDay: 999,  likesPerDay: 9999, repostsPerDay: 9999, dmRequestsPerDay: 999, apiCallsPerMinute: 999 },
  starter:      { maxSites: 1,   maxAvatars: 3,   visitsPerDay: 50,   postsPerDay: 10,   likesPerDay: 200, repostsPerDay: 50, dmRequestsPerDay: 5,   apiCallsPerMinute: 30  },
  pro:          { maxSites: 5,   maxAvatars: 20,  visitsPerDay: 500,  postsPerDay: 100,  likesPerDay: 2000, repostsPerDay: 500, dmRequestsPerDay: 50,  apiCallsPerMinute: 120 },
  enterprise:   { maxSites: 999, maxAvatars: 999, visitsPerDay: 9999, postsPerDay: 9999, likesPerDay: 9999, repostsPerDay: 9999, dmRequestsPerDay: 999, apiCallsPerMinute: 999 },
};

export class GatewayStorage {
  private readonly db: StorageDatabase;
  private auditChainHead = "0000000000000000000000000000000000000000000000000000000000000000";

  constructor(path = ":memory:") {
    this.db = createSqlJsDatabase(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
    this.db.flush();
  }

  snapshot(): Uint8Array { return this.db.serialize(); }

  restoreSnapshot(snapshot: Uint8Array): void {
    this.db.restore(snapshot);
    this.db.pragma("foreign_keys = ON");
    this.auditChainHead = "0000000000000000000000000000000000000000000000000000000000000000";
    this.migrate();
  }

  flush(): void { this.db.flush(); }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sites (
        site_did TEXT PRIMARY KEY,
        origin TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        public_key_pem TEXT NOT NULL,
        backend_url TEXT NOT NULL,
        contact TEXT NOT NULL,
        mtls_cert_fingerprint TEXT NOT NULL DEFAULT '',
        accepting_visitors INTEGER NOT NULL DEFAULT 1,
        offered_scopes TEXT NOT NULL DEFAULT '["chat:send","chat:receive","page:read-public","presence:announce"]',
        public_paths TEXT NOT NULL DEFAULT '["/","/*"]',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS avatars (
        avatar_did TEXT PRIMARY KEY,
        site_did TEXT NOT NULL REFERENCES sites(site_did),
        name TEXT NOT NULL,
        public_key_pem TEXT NOT NULL,
        public_bio TEXT NOT NULL DEFAULT '',
        look TEXT NOT NULL DEFAULT '{}',
        travel_enabled INTEGER NOT NULL DEFAULT 1,
        max_visits_per_day INTEGER NOT NULL DEFAULT 10,
        network_scopes TEXT NOT NULL DEFAULT '["profile:write","timeline:read","timeline:post","follow:write","dm:send","dm:receive","feed:read","block:write"]',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS visits (
        visit_id TEXT PRIMARY KEY,
        visitor_avatar_did TEXT NOT NULL,
        home_site_did TEXT NOT NULL,
        host_site_did TEXT NOT NULL,
        granted_scopes TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reason TEXT,
        created_at TEXT NOT NULL,
        ended_at TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        ts TEXT NOT NULL,
        type TEXT NOT NULL,
        visit_id TEXT,
        actor TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '{}',
        prev_hash TEXT NOT NULL,
        hash TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS revocations (
        revocation_id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        effective_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS token_replay (
        jti TEXT PRIMARY KEY,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        avatar_did TEXT PRIMARY KEY,
        handle TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        public_bio TEXT NOT NULL DEFAULT '',
        home_origin TEXT NOT NULL,
        follow_policy TEXT NOT NULL DEFAULT 'open',
        dm_policy TEXT NOT NULL DEFAULT 'request',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS posts (
        post_id TEXT PRIMARY KEY,
        author TEXT NOT NULL,
        text TEXT NOT NULL,
        reply_to TEXT,
        created_at TEXT NOT NULL,
        signature TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS likes (
        like_id TEXT PRIMARY KEY,
        actor_did TEXT NOT NULL,
        post_id TEXT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        UNIQUE(actor_did, post_id)
      );

      CREATE TABLE IF NOT EXISTS reposts (
        repost_id TEXT PRIMARY KEY,
        actor_did TEXT NOT NULL,
        post_id TEXT NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
        created_at TEXT NOT NULL,
        UNIQUE(actor_did, post_id)
      );

      CREATE TABLE IF NOT EXISTS blocks (
        block_id TEXT PRIMARY KEY,
        blocker_did TEXT NOT NULL,
        blocked_did TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(blocker_did, blocked_did)
      );

      CREATE TABLE IF NOT EXISTS reports (
        report_id TEXT PRIMARY KEY,
        reporter_did TEXT NOT NULL,
        subject_did TEXT NOT NULL,
        ref_type TEXT,
        ref_id TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS spam_flags (
        flag_id TEXT PRIMARY KEY,
        actor_did TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(actor_did, target_type, target_id)
      );

      CREATE TABLE IF NOT EXISTS follows (
        follow_id TEXT PRIMARY KEY,
        follower TEXT NOT NULL,
        followee TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        UNIQUE(follower, followee)
      );

      CREATE TABLE IF NOT EXISTS dm_threads (
        thread_id TEXT PRIMARY KEY,
        participant1 TEXT NOT NULL,
        participant2 TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        intro TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dm_messages (
        message_id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        from_did TEXT NOT NULL,
        text TEXT NOT NULL,
        seq INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        signature TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS activity_feed (
        activity_id TEXT PRIMARY KEY,
        actor_did TEXT NOT NULL,
        type TEXT NOT NULL,
        ref_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'public',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tenants (
        tenant_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'self_hosted',
        api_key_hash TEXT NOT NULL UNIQUE,
        quotas TEXT NOT NULL,
        usage_reset_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tenant_usage (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
        event_type TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        ts TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_reply_to ON posts(reply_to);
      CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_reposts_actor_created ON reposts(actor_did, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_follows_follower_active ON follows(follower, status);
      CREATE INDEX IF NOT EXISTS idx_reports_subject_created ON reports(subject_did, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_spam_flags_target ON spam_flags(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_blocks_pair ON blocks(blocker_did, blocked_did);
    `);

    const dmThreadColumns = new Set(
      (this.db.pragma("table_info(dm_threads)") as Array<{ name: string }>).map((column) => column.name),
    );
    if (!dmThreadColumns.has("status")) {
      this.db.exec("ALTER TABLE dm_threads ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
    }
    if (!dmThreadColumns.has("intro")) {
      this.db.exec("ALTER TABLE dm_threads ADD COLUMN intro TEXT NOT NULL DEFAULT ''");
    }
    const avatarColumns = new Set(
      (this.db.pragma("table_info(avatars)") as Array<{ name: string }>).map((column) => column.name),
    );
    if (!avatarColumns.has("network_scopes")) {
      this.db.exec(`ALTER TABLE avatars ADD COLUMN network_scopes TEXT NOT NULL DEFAULT '["profile:write","timeline:read","timeline:post","follow:write","dm:send","dm:receive","feed:read","block:write"]'`);
    }

    // Load chain head from last audit event
    const last = this.db.prepare<[], { hash: string }>("SELECT hash FROM audit_events ORDER BY ts DESC LIMIT 1").get();
    if (last) this.auditChainHead = last.hash;
  }

  // --- Sites ---

  registerSite(record: SiteRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO sites
        (site_did, origin, display_name, public_key_pem, backend_url, contact,
         mtls_cert_fingerprint, accepting_visitors, offered_scopes, public_paths, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.siteDid, record.origin, record.displayName, record.publicKeyPem,
      record.backendUrl, record.contact, record.mtlsCertFingerprint,
      record.acceptingVisitors ? 1 : 0,
      JSON.stringify(record.offeredScopes), JSON.stringify(record.publicPaths),
      record.createdAt,
    );
  }

  getSite(siteDid: string): SiteRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM sites WHERE site_did = ?").get(siteDid);
    if (!row) return undefined;
    return this.rowToSite(row);
  }

  getSiteByOrigin(origin: string): SiteRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM sites WHERE origin = ?").get(origin);
    if (!row) return undefined;
    return this.rowToSite(row);
  }

  getSiteByMtlsFingerprint(fingerprint: string): SiteRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM sites WHERE mtls_cert_fingerprint = ?").get(fingerprint);
    if (!row) return undefined;
    return this.rowToSite(row);
  }

  listSites(): SiteRecord[] {
    return this.db.prepare<[], Record<string, unknown>>("SELECT * FROM sites WHERE accepting_visitors = 1").all().map((r) => this.rowToSite(r));
  }

  private rowToSite(row: Record<string, unknown>): SiteRecord {
    return {
      siteDid: row.site_did as string,
      origin: row.origin as string,
      displayName: row.display_name as string,
      publicKeyPem: row.public_key_pem as string,
      backendUrl: row.backend_url as string,
      contact: row.contact as string,
      mtlsCertFingerprint: row.mtls_cert_fingerprint as string,
      acceptingVisitors: (row.accepting_visitors as number) === 1,
      offeredScopes: JSON.parse(row.offered_scopes as string) as Scope[],
      publicPaths: JSON.parse(row.public_paths as string) as string[],
      createdAt: row.created_at as string,
    };
  }

  // --- Avatars ---

  registerAvatar(record: AvatarRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO avatars
        (avatar_did, site_did, name, public_key_pem, public_bio, look,
         travel_enabled, max_visits_per_day, network_scopes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.avatarDid, record.siteDid, record.name, record.publicKeyPem,
      record.publicBio, JSON.stringify(record.look),
      record.travelEnabled ? 1 : 0, record.maxVisitsPerDay,
      JSON.stringify(record.networkScopes ?? ["profile:write", "timeline:read", "timeline:post", "follow:write", "dm:send", "dm:receive", "feed:read", "block:write"]),
      record.createdAt,
    );
  }

  getAvatar(avatarDid: string): AvatarRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM avatars WHERE avatar_did = ?").get(avatarDid);
    if (!row) return undefined;
    return this.rowToAvatar(row);
  }

  listAvatarsForSite(siteDid: string): AvatarRecord[] {
    return this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM avatars WHERE site_did = ?").all(siteDid).map((r) => this.rowToAvatar(r));
  }

  private rowToAvatar(row: Record<string, unknown>): AvatarRecord {
    return {
      avatarDid: row.avatar_did as string,
      siteDid: row.site_did as string,
      name: row.name as string,
      publicKeyPem: row.public_key_pem as string,
      publicBio: row.public_bio as string,
      look: JSON.parse(row.look as string) as Record<string, unknown>,
      travelEnabled: (row.travel_enabled as number) === 1,
      maxVisitsPerDay: row.max_visits_per_day as number,
      networkScopes: JSON.parse(row.network_scopes as string) as Scope[],
      createdAt: row.created_at as string,
    };
  }

  // --- Visits ---

  createVisit(record: VisitRecord): void {
    this.db.prepare(`
      INSERT INTO visits
        (visit_id, visitor_avatar_did, home_site_did, host_site_did,
         granted_scopes, status, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.visitId, record.visitorAvatarDid, record.homeSiteDid,
      record.hostSiteDid, JSON.stringify(record.grantedScopes),
      record.status, record.reason ?? null, record.createdAt,
    );
  }

  getVisit(visitId: string): VisitRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM visits WHERE visit_id = ?").get(visitId);
    if (!row) return undefined;
    return this.rowToVisit(row);
  }

  updateVisitStatus(visitId: string, status: VisitRecord["status"], reason?: string, endedAt?: string): void {
    this.db.prepare("UPDATE visits SET status = ?, reason = ?, ended_at = ? WHERE visit_id = ?")
      .run(status, reason ?? null, endedAt ?? null, visitId);
  }

  countVisitsSince(visitorAvatarDid: string, since: string): number {
    const row = this.db.prepare<[string, string], { count: number }>(
      "SELECT COUNT(*) AS count FROM visits WHERE visitor_avatar_did = ? AND created_at >= ?"
    ).get(visitorAvatarDid, since);
    return row?.count ?? 0;
  }

  private rowToVisit(row: Record<string, unknown>): VisitRecord {
    return {
      visitId: row.visit_id as string,
      visitorAvatarDid: row.visitor_avatar_did as string,
      homeSiteDid: row.home_site_did as string,
      hostSiteDid: row.host_site_did as string,
      grantedScopes: JSON.parse(row.granted_scopes as string) as Scope[],
      status: row.status as VisitRecord["status"],
      reason: row.reason as string | undefined,
      createdAt: row.created_at as string,
      endedAt: row.ended_at as string | undefined,
    };
  }

  // --- Token replay cache ---

  consumeJti(jti: string, expiresAtSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    // Clean expired entries
    this.db.prepare("DELETE FROM token_replay WHERE expires_at <= ?").run(nowSeconds);
    const existing = this.db.prepare<[string], { jti: string }>("SELECT jti FROM token_replay WHERE jti = ?").get(jti);
    if (existing) return false;
    this.db.prepare("INSERT INTO token_replay (jti, expires_at) VALUES (?, ?)").run(jti, expiresAtSeconds);
    return true;
  }

  // --- Revocations ---

  addRevocation(record: RevocationRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO revocations
        (revocation_id, target_type, target_id, reason, effective_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(record.revocationId, record.targetType, record.targetId, record.reason, record.effectiveAt);
  }

  isRevoked(targetId: string): boolean {
    const row = this.db.prepare<[string, string], { revocation_id: string }>(
      "SELECT revocation_id FROM revocations WHERE target_id = ? AND effective_at <= ?"
    ).get(targetId, new Date().toISOString());
    return !!row;
  }

  listRevocations(since?: string): RevocationRecord[] {
    const rows = since
      ? this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM revocations WHERE effective_at >= ? ORDER BY effective_at DESC").all(since)
      : this.db.prepare<[], Record<string, unknown>>("SELECT * FROM revocations ORDER BY effective_at DESC").all();
    return rows.map((r) => ({
      revocationId: r.revocation_id as string,
      targetType: r.target_type as RevocationRecord["targetType"],
      targetId: r.target_id as string,
      reason: r.reason as string,
      effectiveAt: r.effective_at as string,
    }));
  }

  // --- Audit log ---

  appendAudit(type: string, actor: string, details: Record<string, unknown>, visitId?: string): AuditEvent {
    const id = `evt_${randomUUID()}`;
    const ts = new Date().toISOString();
    const prevHash = this.auditChainHead;
    const content = JSON.stringify({ id, ts, type, actor, details, prevHash });
    const hash = createHash("sha256").update(content).digest("hex");
    this.auditChainHead = hash;
    this.db.prepare(`
      INSERT INTO audit_events (id, ts, type, visit_id, actor, details, prev_hash, hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, ts, type, visitId ?? null, actor, JSON.stringify(details), prevHash, hash);
    return { id, ts, type, visitId, actor, details, prevHash, hash };
  }

  listAudit(siteDid?: string, from?: string, to?: string, limit = 100): AuditEvent[] {
    let query = "SELECT * FROM audit_events WHERE 1=1";
    const params: unknown[] = [];
    if (siteDid) { query += " AND (actor = ? OR details LIKE ?)"; params.push(siteDid, `%${siteDid}%`); }
    if (from) { query += " AND ts >= ?"; params.push(from); }
    if (to) { query += " AND ts <= ?"; params.push(to); }
    query += " ORDER BY ts DESC LIMIT ?";
    params.push(limit);
    return (this.db.prepare(query).all(...params) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      ts: r.ts as string,
      type: r.type as string,
      visitId: r.visit_id as string | undefined,
      actor: r.actor as string,
      details: JSON.parse(r.details as string) as Record<string, unknown>,
      prevHash: r.prev_hash as string,
      hash: r.hash as string,
    }));
  }

  getChainHead(): string { return this.auditChainHead; }

  // --- Social: Profiles ---

  upsertProfile(profile: ProfileRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO profiles
        (avatar_did, handle, name, public_bio, home_origin, follow_policy, dm_policy, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profile.avatarDid, profile.handle, profile.name, profile.publicBio,
      profile.homeOrigin, profile.followPolicy, profile.dmPolicy, profile.updatedAt,
    );
  }

  getProfile(avatarDid: string): ProfileRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM profiles WHERE avatar_did = ?").get(avatarDid);
    if (!row) return undefined;
    return this.rowToProfile(row);
  }

  getProfileByHandle(handle: string): ProfileRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM profiles WHERE handle = ?").get(handle);
    if (!row) return undefined;
    return this.rowToProfile(row);
  }

  private rowToProfile(row: Record<string, unknown>): ProfileRecord {
    return {
      avatarDid: row.avatar_did as string,
      handle: row.handle as string,
      name: row.name as string,
      publicBio: row.public_bio as string,
      homeOrigin: row.home_origin as string,
      followPolicy: row.follow_policy as ProfileRecord["followPolicy"],
      dmPolicy: row.dm_policy as ProfileRecord["dmPolicy"],
      updatedAt: row.updated_at as string,
    };
  }

  // --- Social: Posts ---

  createPost(post: PostRecord): void {
    this.db.prepare(`
      INSERT INTO posts (post_id, author, text, reply_to, created_at, signature)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(post.postId, post.author, post.text, post.replyTo ?? null, post.createdAt, post.signature);
  }

  listTimeline(avatarDid: string, limit = 20, cursor?: string): PostRecord[] {
    const query = cursor
      ? "SELECT * FROM posts WHERE author = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?"
      : "SELECT * FROM posts WHERE author = ? ORDER BY created_at DESC LIMIT ?";
    const args = cursor ? [avatarDid, cursor, limit] : [avatarDid, limit];
    return (this.db.prepare(query).all(...args) as Record<string, unknown>[]).map((r) => this.rowToPost(r));
  }

  listProfiles(): ProfileRecord[] {
    return this.db.prepare<[], Record<string, unknown>>("SELECT * FROM profiles ORDER BY handle ASC")
      .all().map((row) => this.rowToProfile(row));
  }

  countPostsSince(avatarDid: string, since: string): number {
    return this.db.prepare<[string, string], { count: number }>("SELECT COUNT(*) AS count FROM posts WHERE author = ? AND created_at >= ?")
      .get(avatarDid, since)?.count ?? 0;
  }

  countLikesSince(avatarDid: string, since: string): number {
    return this.db.prepare<[string, string], { count: number }>("SELECT COUNT(*) AS count FROM likes WHERE actor_did = ? AND created_at >= ?")
      .get(avatarDid, since)?.count ?? 0;
  }

  countRepostsSince(avatarDid: string, since: string): number {
    return this.db.prepare<[string, string], { count: number }>("SELECT COUNT(*) AS count FROM reposts WHERE actor_did = ? AND created_at >= ?")
      .get(avatarDid, since)?.count ?? 0;
  }

  countFollowsSince(avatarDid: string, since: string): number {
    return this.db.prepare<[string, string], { count: number }>("SELECT COUNT(*) AS count FROM follows WHERE follower = ? AND created_at >= ?")
      .get(avatarDid, since)?.count ?? 0;
  }

  countDmRequestsSince(avatarDid: string, since: string): number {
    return this.db.prepare<[string, string], { count: number }>("SELECT COUNT(*) AS count FROM dm_threads WHERE participant1 = ? AND created_at >= ?")
      .get(avatarDid, since)?.count ?? 0;
  }

  countDmMessagesSince(avatarDid: string, since: string): number {
    return this.db.prepare<[string, string], { count: number }>(
      "SELECT COUNT(*) AS count FROM dm_messages WHERE from_did = ? AND created_at >= ?",
    ).get(avatarDid, since)?.count ?? 0;
  }

  private rowToPost(row: Record<string, unknown>): PostRecord {
    return {
      postId: row.post_id as string,
      author: row.author as string,
      text: row.text as string,
      replyTo: (row.reply_to as string | null) ?? undefined,
      createdAt: row.created_at as string,
      signature: row.signature as string,
    };
  }

  private withPostCounts(post: PostRecord, viewerDid?: string): SocialPostRecord {
    const likeCount = this.db.prepare<[string], { count: number }>("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?").get(post.postId)?.count ?? 0;
    const repostCount = this.db.prepare<[string], { count: number }>("SELECT COUNT(*) AS count FROM reposts WHERE post_id = ?").get(post.postId)?.count ?? 0;
    const likedByMe = viewerDid ? Boolean(this.db.prepare<[string, string], { yes: number }>("SELECT 1 AS yes FROM likes WHERE post_id = ? AND actor_did = ?").get(post.postId, viewerDid)) : undefined;
    const repostedByMe = viewerDid ? Boolean(this.db.prepare<[string, string], { yes: number }>("SELECT 1 AS yes FROM reposts WHERE post_id = ? AND actor_did = ?").get(post.postId, viewerDid)) : undefined;
    return { ...post, likeCount, repostCount, ...(viewerDid ? { likedByMe, repostedByMe } : {}) };
  }

  getPost(postId: string, viewerDid?: string): SocialPostRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM posts WHERE post_id = ?").get(postId);
    if (!row) return undefined;
    const post = this.rowToPost(row);
    if (viewerDid && viewerDid !== post.author && this.areBlocked(viewerDid, post.author)) return undefined;
    return this.withPostCounts(post, viewerDid);
  }

  listReplies(postId: string, viewerDid?: string): SocialPostRecord[] {
    const rows = this.db.prepare<[string], Record<string, unknown>>(
      "SELECT * FROM posts WHERE reply_to = ? ORDER BY created_at ASC, post_id ASC",
    ).all(postId) as Record<string, unknown>[];
    return rows.map((row) => this.rowToPost(row))
      .filter((post) => !viewerDid || viewerDid === post.author || !this.areBlocked(viewerDid, post.author))
      .map((post) => this.withPostCounts(post, viewerDid));
  }

  getThread(postId: string, viewerDid?: string): { post: SocialPostRecord; ancestors: SocialPostRecord[]; replies: SocialPostRecord[] } | undefined {
    const post = this.getPost(postId, viewerDid);
    if (!post) return undefined;
    const ancestors: SocialPostRecord[] = [];
    const seen = new Set([postId]);
    let parentId = post.replyTo;
    while (parentId && !seen.has(parentId) && ancestors.length < 100) {
      seen.add(parentId);
      const parent = this.getPost(parentId, viewerDid);
      if (!parent) break;
      ancestors.unshift(parent);
      parentId = parent.replyTo;
    }
    const rootId = ancestors[0]?.postId ?? post.postId;
    return { post, ancestors, replies: this.listReplies(rootId, viewerDid) };
  }

  listProfileTimeline(avatarDid: string, limit = 20, cursor?: string, viewerDid?: string): TimelineEntry[] {
    const rows = this.db.prepare<[string, string | null, string | null, string, string | null, string | null, number], Record<string, unknown>>(
      `SELECT p.*, p.created_at AS event_created_at, 'post' AS event_kind, p.author AS event_actor
       FROM posts p WHERE p.author = ? AND (? IS NULL OR p.created_at < ?)
       UNION ALL
       SELECT p.*, r.created_at AS event_created_at, 'repost' AS event_kind, r.actor_did AS event_actor
       FROM reposts r JOIN posts p ON p.post_id = r.post_id
       WHERE r.actor_did = ? AND (? IS NULL OR r.created_at < ?)
       ORDER BY event_created_at DESC LIMIT ?`,
    ).all(avatarDid, cursor ?? null, cursor ?? null, avatarDid, cursor ?? null, cursor ?? null, limit) as Record<string, unknown>[];
    return rows.map((row) => ({
      kind: row.event_kind as TimelineEntry["kind"],
      actorDid: row.event_actor as string,
      createdAt: row.event_created_at as string,
      post: this.withPostCounts(this.rowToPost(row), viewerDid),
    })).filter((entry) => !viewerDid || (viewerDid === entry.post.author && viewerDid === entry.actorDid) ||
      (!this.areBlocked(viewerDid, entry.post.author) && !this.areBlocked(viewerDid, entry.actorDid)));
  }

  listNetworkTimeline(limit = 100): TimelineEntry[] {
    const rows = this.db.prepare<[number], Record<string, unknown>>(
      `SELECT p.*, p.created_at AS event_created_at, 'post' AS event_kind, p.author AS event_actor
       FROM posts p
       UNION ALL
       SELECT p.*, r.created_at AS event_created_at, 'repost' AS event_kind, r.actor_did AS event_actor
       FROM reposts r JOIN posts p ON p.post_id = r.post_id
       ORDER BY event_created_at DESC, post_id ASC LIMIT ?`,
    ).all(limit) as Record<string, unknown>[];
    return rows.map((row) => ({
      kind: row.event_kind as TimelineEntry["kind"],
      actorDid: row.event_actor as string,
      createdAt: row.event_created_at as string,
      post: this.withPostCounts(this.rowToPost(row)),
    }));
  }

  listHomeTimeline(followerDid: string, limit = 20, cursor?: string): TimelineEntry[] {
    const posts = this.db.prepare<[string, string | null, string | null, string, string, string, string | null, string | null, string, string, string, string, number], Record<string, unknown>>(
      `SELECT p.*, p.created_at AS event_created_at, 'post' AS event_kind, p.author AS event_actor
       FROM posts p JOIN follows f ON f.followee = p.author AND f.follower = ? AND f.status = 'active'
       WHERE (? IS NULL OR p.created_at < ?)
         AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_did = ? AND b.blocked_did = p.author) OR (b.blocker_did = p.author AND b.blocked_did = ?))
       UNION ALL
       SELECT p.*, r.created_at AS event_created_at, 'repost' AS event_kind, r.actor_did AS event_actor
       FROM reposts r JOIN posts p ON p.post_id = r.post_id
       JOIN follows f ON f.followee = r.actor_did AND f.follower = ? AND f.status = 'active'
       WHERE (? IS NULL OR r.created_at < ?)
         AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_did = ? AND b.blocked_did = r.actor_did) OR (b.blocker_did = r.actor_did AND b.blocked_did = ?))
         AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_did = ? AND b.blocked_did = p.author) OR (b.blocker_did = p.author AND b.blocked_did = ?))
       ORDER BY event_created_at DESC LIMIT ?`,
    ).all(followerDid, cursor ?? null, cursor ?? null, followerDid, followerDid,
      followerDid, cursor ?? null, cursor ?? null, followerDid, followerDid, followerDid, followerDid, limit) as Record<string, unknown>[];
    return posts.map((row) => ({
      kind: row.event_kind as TimelineEntry["kind"],
      actorDid: row.event_actor as string,
      createdAt: row.event_created_at as string,
      post: this.withPostCounts(this.rowToPost(row), followerDid),
    }));
  }

  hasLike(actorDid: string, postId: string): boolean {
    return Boolean(this.db.prepare<[string, string], { yes: number }>("SELECT 1 AS yes FROM likes WHERE actor_did = ? AND post_id = ?")
      .get(actorDid, postId));
  }

  likePost(actorDid: string, postId: string, createdAt = new Date().toISOString()): boolean {
    return this.db.prepare("INSERT OR IGNORE INTO likes (like_id, actor_did, post_id, created_at) VALUES (?, ?, ?, ?)")
      .run(`lik_${randomUUID()}`, actorDid, postId, createdAt).changes > 0;
  }

  unlikePost(actorDid: string, postId: string): boolean {
    return this.db.prepare("DELETE FROM likes WHERE actor_did = ? AND post_id = ?").run(actorDid, postId).changes > 0;
  }

  hasRepost(actorDid: string, postId: string): boolean {
    return Boolean(this.db.prepare<[string, string], { yes: number }>("SELECT 1 AS yes FROM reposts WHERE actor_did = ? AND post_id = ?")
      .get(actorDid, postId));
  }

  repostPost(actorDid: string, postId: string, createdAt = new Date().toISOString()): boolean {
    return this.db.prepare("INSERT OR IGNORE INTO reposts (repost_id, actor_did, post_id, created_at) VALUES (?, ?, ?, ?)")
      .run(`rpt_${randomUUID()}`, actorDid, postId, createdAt).changes > 0;
  }

  unrepostPost(actorDid: string, postId: string): boolean {
    return this.db.prepare("DELETE FROM reposts WHERE actor_did = ? AND post_id = ?").run(actorDid, postId).changes > 0;
  }

  createBlock(record: BlockRecord): void {
    this.db.prepare("INSERT OR IGNORE INTO blocks (block_id, blocker_did, blocked_did, created_at) VALUES (?, ?, ?, ?)")
      .run(record.blockId, record.blockerDid, record.blockedDid, record.createdAt);
  }

  removeBlock(blockerDid: string, blockedDid: string): boolean {
    return this.db.prepare("DELETE FROM blocks WHERE blocker_did = ? AND blocked_did = ?").run(blockerDid, blockedDid).changes > 0;
  }

  removeFollowsBetween(firstDid: string, secondDid: string): void {
    this.db.prepare("DELETE FROM follows WHERE (follower = ? AND followee = ?) OR (follower = ? AND followee = ?)")
      .run(firstDid, secondDid, secondDid, firstDid);
  }

  areBlocked(firstDid: string, secondDid: string): boolean {
    return Boolean(this.db.prepare<[string, string, string, string], { yes: number }>(
      "SELECT 1 AS yes FROM blocks WHERE (blocker_did = ? AND blocked_did = ?) OR (blocker_did = ? AND blocked_did = ?) LIMIT 1",
    ).get(firstDid, secondDid, secondDid, firstDid));
  }

  createReport(record: ReportRecord & { reportId: string; reporterDid: string; subjectDid: string }): void {
    this.db.prepare("INSERT INTO reports (report_id, reporter_did, subject_did, ref_type, ref_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(record.reportId, record.reporterDid, record.subjectDid, record.refType ?? null, record.refId ?? null, record.note ?? null, record.createdAt);
  }

  listReportsForAgent(agentDid: string): ReportRecord[] {
    return (this.db.prepare<[string, string, string], Record<string, unknown>>(
      `SELECT DISTINCT r.* FROM reports r LEFT JOIN posts p ON r.ref_type IN ('post','thread') AND p.post_id = r.ref_id
       WHERE r.reporter_did = ? OR r.subject_did = ? OR p.author = ? ORDER BY r.created_at DESC`,
    ).all(agentDid, agentDid, agentDid) as Record<string, unknown>[]).map((row) => ({
      reportId: row.report_id as string, reporterDid: row.reporter_did as string, subjectDid: row.subject_did as string,
      refType: (row.ref_type as ReportRecord["refType"] | null) ?? undefined, refId: (row.ref_id as string | null) ?? undefined,
      note: (row.note as string | null) ?? undefined, createdAt: row.created_at as string,
    }));
  }

  createSpamFlag(record: SpamFlagRecord): void {
    this.db.prepare("INSERT OR IGNORE INTO spam_flags (flag_id, actor_did, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(record.flagId, record.actorDid, record.targetType, record.targetId, record.createdAt);
  }

  removeSpamFlag(actorDid: string, targetType: SpamFlagRecord["targetType"], targetId: string): boolean {
    return this.db.prepare("DELETE FROM spam_flags WHERE actor_did = ? AND target_type = ? AND target_id = ?")
      .run(actorDid, targetType, targetId).changes > 0;
  }

  listSpamFlagsForAgent(agentDid: string): SpamFlagRecord[] {
    return (this.db.prepare<[string, string, string], Record<string, unknown>>(
      `SELECT DISTINCT s.* FROM spam_flags s LEFT JOIN posts p ON s.target_type = 'post' AND p.post_id = s.target_id
       WHERE s.actor_did = ? OR (s.target_type = 'agent' AND s.target_id = ?) OR p.author = ? ORDER BY s.created_at DESC`,
    ).all(agentDid, agentDid, agentDid) as Record<string, unknown>[]).map((row) => ({
      flagId: row.flag_id as string, actorDid: row.actor_did as string, targetType: row.target_type as SpamFlagRecord["targetType"],
      targetId: row.target_id as string, createdAt: row.created_at as string,
    }));
  }

  deletePost(postId: string, author: string): boolean {
    const result = this.db.prepare("DELETE FROM posts WHERE post_id = ? AND author = ?").run(postId, author);
    return result.changes > 0;
  }

  // --- Social: Follows ---

  createFollow(follow: FollowRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO follows (follow_id, follower, followee, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(follow.followId, follow.follower, follow.followee, follow.status, follow.createdAt);
  }

  getFollow(follower: string, followee: string): FollowRecord | undefined {
    const row = this.db.prepare<[string, string], Record<string, unknown>>("SELECT * FROM follows WHERE follower = ? AND followee = ?").get(follower, followee);
    if (!row) return undefined;
    return { followId: row.follow_id as string, follower: row.follower as string, followee: row.followee as string, status: row.status as FollowRecord["status"], createdAt: row.created_at as string };
  }

  getFollowById(followId: string): FollowRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM follows WHERE follow_id = ?").get(followId);
    if (!row) return undefined;
    return {
      followId: row.follow_id as string,
      follower: row.follower as string,
      followee: row.followee as string,
      status: row.status as FollowRecord["status"],
      createdAt: row.created_at as string,
    };
  }

  updateFollowStatus(followId: string, status: FollowRecord["status"]): void {
    this.db.prepare("UPDATE follows SET status = ? WHERE follow_id = ?").run(status, followId);
  }

  removeFollow(followId: string, followerDid: string): boolean {
    return this.db.prepare("DELETE FROM follows WHERE follow_id = ? AND follower = ?").run(followId, followerDid).changes > 0;
  }

  getFollowers(avatarDid: string): string[] {
    return this.db.prepare<[string], { follower: string }>("SELECT follower FROM follows WHERE followee = ? AND status = 'active'").all(avatarDid).map((r) => r.follower);
  }

  getFollowing(avatarDid: string): string[] {
    return this.db.prepare<[string], { followee: string }>("SELECT followee FROM follows WHERE follower = ? AND status = 'active'").all(avatarDid).map((r) => r.followee);
  }

  // --- Social: DMs ---

  findOrCreateDmThread(participant1: string, participant2: string, intro = "", accepted = false): DmThreadRecord {
    const existing = this.db.prepare<[string, string, string, string], Record<string, unknown>>(
      "SELECT * FROM dm_threads WHERE (participant1 = ? AND participant2 = ?) OR (participant1 = ? AND participant2 = ?)"
    ).get(participant1, participant2, participant2, participant1);
    if (existing) {
      return {
        threadId: existing.thread_id as string,
        participant1: existing.participant1 as string,
        participant2: existing.participant2 as string,
        status: existing.status as DmThreadRecord["status"],
        intro: existing.intro as string,
        createdAt: existing.created_at as string,
      };
    }
    const thread: DmThreadRecord = {
      threadId: `dmt_${randomUUID()}`,
      participant1,
      participant2,
      status: accepted ? "accepted" : "pending",
      intro,
      createdAt: new Date().toISOString(),
    };
    this.db.prepare("INSERT INTO dm_threads (thread_id, participant1, participant2, status, intro, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(thread.threadId, thread.participant1, thread.participant2, thread.status, thread.intro, thread.createdAt);
    return thread;
  }

  getDmThread(threadId: string): DmThreadRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM dm_threads WHERE thread_id = ?").get(threadId);
    if (!row) return undefined;
    return {
      threadId: row.thread_id as string,
      participant1: row.participant1 as string,
      participant2: row.participant2 as string,
      status: row.status as DmThreadRecord["status"],
      intro: row.intro as string,
      createdAt: row.created_at as string,
    };
  }

  listDmThreads(avatarDid: string): DmThreadRecord[] {
    return this.db.prepare<[string, string], Record<string, unknown>>(
      "SELECT * FROM dm_threads WHERE participant1 = ? OR participant2 = ? ORDER BY created_at DESC",
    ).all(avatarDid, avatarDid).map((row) => ({
      threadId: row.thread_id as string,
      participant1: row.participant1 as string,
      participant2: row.participant2 as string,
      status: row.status as DmThreadRecord["status"],
      intro: row.intro as string,
      createdAt: row.created_at as string,
    }));
  }

  setDmThreadStatus(threadId: string, status: DmThreadRecord["status"]): void {
    this.db.prepare("UPDATE dm_threads SET status = ? WHERE thread_id = ?").run(status, threadId);
  }

  addDmMessage(msg: DmMessageRecord): void {
    this.db.prepare(`
      INSERT INTO dm_messages (message_id, thread_id, from_did, text, seq, created_at, signature)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(msg.messageId, msg.threadId, msg.from, msg.text, msg.seq, msg.createdAt, msg.signature);
  }

  getDmMessages(threadId: string, limit = 50): DmMessageRecord[] {
    return this.db.prepare<[string, number], Record<string, unknown>>("SELECT * FROM dm_messages WHERE thread_id = ? ORDER BY seq ASC LIMIT ?").all(threadId, limit).map((r) => ({
      messageId: r.message_id as string,
      threadId: r.thread_id as string,
      from: r.from_did as string,
      text: r.text as string,
      seq: r.seq as number,
      createdAt: r.created_at as string,
      signature: r.signature as string,
    }));
  }

  getNextDmSequence(threadId: string): number {
    const row = this.db.prepare<[string], { next_seq: number }>(
      "SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM dm_messages WHERE thread_id = ?",
    ).get(threadId);
    return row?.next_seq ?? 1;
  }

  // --- Activity feed ---

  addActivity(record: ActivityRecord): void {
    this.db.prepare(`
      INSERT INTO activity_feed (activity_id, actor_did, type, ref_id, summary, visibility, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(record.activityId, record.actorDid, record.type, record.refId, record.summary, record.visibility, record.createdAt);
  }

  getActivityFeed(limit = 50, cursor?: string, followingOf?: string): ActivityRecord[] {
    let query = "SELECT * FROM activity_feed WHERE visibility = 'public'";
    const params: unknown[] = [];
    if (followingOf) {
      query = `SELECT af.* FROM activity_feed af
        JOIN follows f ON f.followee = af.actor_did AND f.follower = ? AND f.status = 'active'
        WHERE af.visibility = 'public'`;
      params.push(followingOf);
    }
    if (cursor) { query += " AND created_at < ?"; params.push(cursor); }
    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);
    return (this.db.prepare(query).all(...params) as Record<string, unknown>[]).map((r) => ({
      activityId: r.activity_id as string,
      actorDid: r.actor_did as string,
      type: r.type as ActivityRecord["type"],
      refId: r.ref_id as string,
      summary: r.summary as string,
      visibility: r.visibility as "public" | "private",
      createdAt: r.created_at as string,
    }));
  }

  // --- Tenants ---

  createTenant(record: TenantRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO tenants
        (tenant_id, name, plan, api_key_hash, quotas, usage_reset_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.tenantId, record.name, record.plan,
      createHash("sha256").update(record.apiKey).digest("hex"),
      JSON.stringify(record.quotas), record.usageResetAt, record.createdAt,
    );
  }

  getTenantByApiKey(apiKey: string): TenantRecord | undefined {
    const hash = createHash("sha256").update(apiKey).digest("hex");
    const row = this.db.prepare<[string], Record<string, unknown>>(
      "SELECT * FROM tenants WHERE api_key_hash = ?"
    ).get(hash);
    if (!row) return undefined;
    const plan = row.plan as TenantPlan;
    return {
      tenantId: row.tenant_id as string,
      name: row.name as string,
      plan,
      apiKey: apiKey,
      quotas: { ...DEFAULT_TENANT_QUOTAS[plan], ...(JSON.parse(row.quotas as string) as Partial<TenantQuotas>) },
      usageResetAt: row.usage_reset_at as string,
      createdAt: row.created_at as string,
    };
  }

  getTenant(tenantId: string): TenantRecord | undefined {
    const row = this.db.prepare<[string], Record<string, unknown>>(
      "SELECT * FROM tenants WHERE tenant_id = ?"
    ).get(tenantId);
    if (!row) return undefined;
    const plan = row.plan as TenantPlan;
    return {
      tenantId: row.tenant_id as string,
      name: row.name as string,
      plan,
      apiKey: "",
      quotas: { ...DEFAULT_TENANT_QUOTAS[plan], ...(JSON.parse(row.quotas as string) as Partial<TenantQuotas>) },
      usageResetAt: row.usage_reset_at as string,
      createdAt: row.created_at as string,
    };
  }

  recordUsage(event: UsageMeteringEvent, billingAdapter?: BillingAdapter): void {
    this.db.prepare(`
      INSERT INTO tenant_usage (id, tenant_id, event_type, quantity, ts, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`usg_${randomUUID()}`, event.tenantId, event.eventType, event.quantity, event.ts, JSON.stringify(event.metadata ?? {}));
    if (billingAdapter) {
      billingAdapter.onUsage(event).catch(() => { /* non-fatal */ });
    }
  }

  getTenantDailyUsage(tenantId: string, eventType: UsageMeteringEvent["eventType"], since: string): number {
    const row = this.db.prepare<[string, string, string], { total: number }>(
      "SELECT COALESCE(SUM(quantity), 0) AS total FROM tenant_usage WHERE tenant_id = ? AND event_type = ? AND ts >= ?"
    ).get(tenantId, eventType, since);
    return row?.total ?? 0;
  }

  checkTenantQuota(tenantId: string, resource: "visitsPerDay" | "postsPerDay" | "likesPerDay" | "repostsPerDay" | "dmRequestsPerDay"): { allowed: boolean; used: number; limit: number } {
    const tenant = this.getTenant(tenantId);
    if (!tenant) return { allowed: true, used: 0, limit: 9999 };
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const eventMap: Record<string, UsageMeteringEvent["eventType"]> = {
      visitsPerDay: "visit.started",
      postsPerDay: "post.created",
      likesPerDay: "like.created",
      repostsPerDay: "repost.created",
      dmRequestsPerDay: "dm.sent",
    };
    const used = this.getTenantDailyUsage(tenantId, eventMap[resource], dayStart.toISOString());
    const limit = tenant.quotas[resource];
    return { allowed: used < limit, used, limit };
  }

  close(): void { this.db.close(); }
}
