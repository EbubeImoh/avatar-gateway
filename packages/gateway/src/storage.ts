import Database from "better-sqlite3";
import { randomUUID, createHash } from "node:crypto";
import type { Scope } from "./policy.js";

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

export class GatewayStorage {
  private readonly db: Database.Database;
  private auditChainHead = "0000000000000000000000000000000000000000000000000000000000000000";

  constructor(path = ":memory:") {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

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
    `);

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
         travel_enabled, max_visits_per_day, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.avatarDid, record.siteDid, record.name, record.publicKeyPem,
      record.publicBio, JSON.stringify(record.look),
      record.travelEnabled ? 1 : 0, record.maxVisitsPerDay, record.createdAt,
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
    const query = since
      ? this.db.prepare<[string], Record<string, unknown>>("SELECT * FROM revocations WHERE effective_at >= ? ORDER BY effective_at DESC")
      : this.db.prepare<[], Record<string, unknown>>("SELECT * FROM revocations ORDER BY effective_at DESC");
    const rows = (since ? (query as Database.Statement<[string]>).all(since) : (query as Database.Statement<[]>).all()) as Record<string, unknown>[];
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
    return (this.db.prepare(query).all(...args) as Record<string, unknown>[]).map((r) => ({
      postId: r.post_id as string,
      author: r.author as string,
      text: r.text as string,
      replyTo: r.reply_to as string | undefined,
      createdAt: r.created_at as string,
      signature: r.signature as string,
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

  updateFollowStatus(followId: string, status: FollowRecord["status"]): void {
    this.db.prepare("UPDATE follows SET status = ? WHERE follow_id = ?").run(status, followId);
  }

  getFollowers(avatarDid: string): string[] {
    return this.db.prepare<[string], { follower: string }>("SELECT follower FROM follows WHERE followee = ? AND status = 'active'").all(avatarDid).map((r) => r.follower);
  }

  getFollowing(avatarDid: string): string[] {
    return this.db.prepare<[string], { followee: string }>("SELECT followee FROM follows WHERE follower = ? AND status = 'active'").all(avatarDid).map((r) => r.followee);
  }

  // --- Social: DMs ---

  findOrCreateDmThread(participant1: string, participant2: string): DmThreadRecord {
    const existing = this.db.prepare<[string, string, string, string], Record<string, unknown>>(
      "SELECT * FROM dm_threads WHERE (participant1 = ? AND participant2 = ?) OR (participant1 = ? AND participant2 = ?)"
    ).get(participant1, participant2, participant2, participant1);
    if (existing) {
      return { threadId: existing.thread_id as string, participant1: existing.participant1 as string, participant2: existing.participant2 as string, createdAt: existing.created_at as string };
    }
    const thread: DmThreadRecord = { threadId: `dmt_${randomUUID()}`, participant1, participant2, createdAt: new Date().toISOString() };
    this.db.prepare("INSERT INTO dm_threads (thread_id, participant1, participant2, created_at) VALUES (?, ?, ?, ?)").run(thread.threadId, thread.participant1, thread.participant2, thread.createdAt);
    return thread;
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

  close(): void { this.db.close(); }
}
