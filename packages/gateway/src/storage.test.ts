import { describe, expect, it, beforeEach } from "vitest";
import { GatewayStorage } from "./storage.js";
import { BlobGatewayStorage, GatewayStorageConflictError, type GatewayBlobSnapshot, type GatewayBlobStore } from "./blob-storage.js";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("GatewayStorage (SQLite in-memory)", () => {
  let storage: GatewayStorage;

  beforeEach(() => {
    storage = new GatewayStorage(":memory:");
  });

  it("registers and retrieves a site", () => {
    storage.registerSite({
      siteDid: "did:key:zSiteA",
      origin: "https://site-a.example",
      displayName: "Site A",
      publicKeyPem: "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----",
      backendUrl: "https://site-a.example",
      contact: "admin@site-a.example",
      mtlsCertFingerprint: "sha256:abc123",
      acceptingVisitors: true,
      offeredScopes: ["chat:send", "chat:receive"],
      publicPaths: ["/", "/about"],
      createdAt: new Date().toISOString(),
    });
    const site = storage.getSite("did:key:zSiteA");
    expect(site).toBeDefined();
    expect(site?.origin).toBe("https://site-a.example");
    expect(site?.offeredScopes).toEqual(["chat:send", "chat:receive"]);
    expect(storage.getSiteByOrigin("https://site-a.example")?.siteDid).toBe("did:key:zSiteA");
    expect(storage.getSiteByMtlsFingerprint("sha256:abc123")?.siteDid).toBe("did:key:zSiteA");
  });

  it("persists the local SQLite file across GatewayStorage instances", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gateway-sqlite-file-"));
    const path = join(dir, "gateway.sqlite");
    try {
      const first = new GatewayStorage(path);
      first.appendAudit("local.persisted", "test", { safe: true });
      first.close();
      expect((await stat(path).then((file) => file.mode & 0o777))).toBe(0o600);
      const reopened = new GatewayStorage(path);
      expect(reopened.listAudit().map((event) => event.type)).toContain("local.persisted");
      reopened.close();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("registers and retrieves an avatar", () => {
    storage.registerSite({ siteDid: "did:key:zSite", origin: "https://site.example", displayName: "Site", publicKeyPem: "pk", backendUrl: "https://site.example", contact: "", mtlsCertFingerprint: "", acceptingVisitors: true, offeredScopes: ["chat:send"], publicPaths: ["/"], createdAt: new Date().toISOString() });
    storage.registerAvatar({ avatarDid: "did:key:zAvatar", siteDid: "did:key:zSite", name: "Bot", publicKeyPem: "pk", publicBio: "A bot", look: { style: "brick-minifig" }, travelEnabled: true, maxVisitsPerDay: 5, createdAt: new Date().toISOString() });
    const avatar = storage.getAvatar("did:key:zAvatar");
    expect(avatar?.name).toBe("Bot");
    expect(storage.listAvatarsForSite("did:key:zSite")).toHaveLength(1);
  });

  it("creates and updates a visit", () => {
    storage.createVisit({ visitId: "vst_001", visitorAvatarDid: "did:key:zA", homeSiteDid: "did:key:zH", hostSiteDid: "did:key:zB", grantedScopes: ["chat:send"], status: "pending", createdAt: new Date().toISOString() });
    expect(storage.getVisit("vst_001")?.status).toBe("pending");
    storage.updateVisitStatus("vst_001", "active");
    expect(storage.getVisit("vst_001")?.status).toBe("active");
    storage.updateVisitStatus("vst_001", "ended", "visitor_left", new Date().toISOString());
    expect(storage.getVisit("vst_001")?.status).toBe("ended");
  });

  it("consumes JTIs and prevents replay", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(storage.consumeJti("jti-123", now + 300, now)).toBe(true);
    expect(storage.consumeJti("jti-123", now + 300, now)).toBe(false);
    expect(storage.consumeJti("jti-456", now + 300, now)).toBe(true);
  });

  it("records revocations and checks them", () => {
    storage.addRevocation({ revocationId: "rev_1", targetType: "avatar", targetId: "did:key:zBad", reason: "abuse", effectiveAt: new Date().toISOString() });
    expect(storage.isRevoked("did:key:zBad")).toBe(true);
    expect(storage.isRevoked("did:key:zGood")).toBe(false);
    expect(storage.listRevocations()).toHaveLength(1);
  });

  it("appends audit events with hash chaining", () => {
    const e1 = storage.appendAudit("site.registered", "did:key:zA", { origin: "https://a.example" });
    const e2 = storage.appendAudit("visit.requested", "did:key:zB", { visit_id: "vst_1" }, "vst_1");
    expect(e1.prevHash).toBe("0000000000000000000000000000000000000000000000000000000000000000");
    expect(e2.prevHash).toBe(e1.hash);
    expect(e2.hash).not.toBe(e1.hash);
    const events = storage.listAudit();
    expect(events.length).toBe(2);
    expect(storage.getChainHead()).toBe(e2.hash);
  });

  it("manages social profiles", () => {
    storage.upsertProfile({ avatarDid: "did:key:zA", handle: "bot-a@site.example", name: "Bot A", publicBio: "Hello", homeOrigin: "https://site.example", followPolicy: "open", dmPolicy: "request", updatedAt: new Date().toISOString() });
    expect(storage.getProfile("did:key:zA")?.name).toBe("Bot A");
    expect(storage.getProfileByHandle("bot-a@site.example")?.avatarDid).toBe("did:key:zA");
  });

  it("manages posts and timelines", () => {
    storage.createPost({ postId: "pst_1", author: "did:key:zA", text: "Hello world!", createdAt: new Date().toISOString(), signature: "" });
    storage.createPost({ postId: "pst_2", author: "did:key:zA", text: "Second post", createdAt: new Date().toISOString(), signature: "" });
    const timeline = storage.listTimeline("did:key:zA");
    expect(timeline).toHaveLength(2);
    expect(storage.deletePost("pst_1", "did:key:zA")).toBe(true);
    expect(storage.listTimeline("did:key:zA")).toHaveLength(1);
  });

  it("manages reply threads, engagement, home timelines, and agent signal records", () => {
    const now = new Date().toISOString();
    storage.createPost({ postId: "pst_root", author: "did:key:zB", text: "Root", createdAt: now, signature: "" });
    storage.createPost({ postId: "pst_reply", author: "did:key:zC", text: "Reply", replyTo: "pst_root", createdAt: now, signature: "" });
    storage.createPost({ postId: "pst_unfollowed", author: "did:key:zD", text: "Outside the home timeline", createdAt: now, signature: "" });
    storage.createFollow({ followId: "fol_active", follower: "did:key:zA", followee: "did:key:zB", status: "active", createdAt: now });
    storage.createFollow({ followId: "fol_pending", follower: "did:key:zA", followee: "did:key:zC", status: "pending", createdAt: now });
    storage.likePost("did:key:zA", "pst_root", now);
    storage.likePost("did:key:zA", "pst_root", now);
    storage.repostPost("did:key:zA", "pst_root", now);
    expect(storage.getPost("pst_root")?.likeCount).toBe(1);
    expect(storage.getThread("pst_reply")?.ancestors.map((post) => post.postId)).toEqual(["pst_root"]);
    expect(storage.getThread("pst_root")?.replies.map((post) => post.postId)).toEqual(["pst_reply"]);
    expect(storage.listHomeTimeline("did:key:zA").map((entry) => entry.post.postId)).toEqual(["pst_root"]);
    expect(storage.listProfileTimeline("did:key:zA").some((entry) => entry.kind === "repost" && entry.post.postId === "pst_root")).toBe(true);

    storage.createBlock({ blockId: "blk_a_b", blockerDid: "did:key:zA", blockedDid: "did:key:zB", createdAt: now });
    expect(storage.getPost("pst_root", "did:key:zA")).toBeUndefined();
    expect(storage.listHomeTimeline("did:key:zA")).toHaveLength(0);
    storage.createReport({ reportId: "rpt_1", reporterDid: "did:key:zA", subjectDid: "did:key:zB", refType: "post", refId: "pst_root", note: "chosen by agent", createdAt: now });
    storage.createSpamFlag({ flagId: "spm_1", actorDid: "did:key:zA", targetType: "post", targetId: "pst_root", createdAt: now });
    expect(storage.listReportsForAgent("did:key:zB")).toHaveLength(1);
    expect(storage.listSpamFlagsForAgent("did:key:zB")).toHaveLength(1);
  });

  it("manages follows and follow graph", () => {
    storage.createFollow({ followId: "fol_1", follower: "did:key:zA", followee: "did:key:zB", status: "active", createdAt: new Date().toISOString() });
    storage.createFollow({ followId: "fol_2", follower: "did:key:zC", followee: "did:key:zB", status: "active", createdAt: new Date().toISOString() });
    expect(storage.getFollowers("did:key:zB")).toEqual(expect.arrayContaining(["did:key:zA", "did:key:zC"]));
    expect(storage.getFollowing("did:key:zA")).toEqual(["did:key:zB"]);
    storage.updateFollowStatus("fol_1", "rejected");
    expect(storage.getFollowers("did:key:zB")).toEqual(["did:key:zC"]);
  });

  it("manages DM threads and messages", () => {
    const thread = storage.findOrCreateDmThread("did:key:zA", "did:key:zB", "Hello");
    expect(thread.threadId).toMatch(/^dmt_/);
    expect(thread.status).toBe("pending");
    expect(thread.intro).toBe("Hello");
    // Same participants return same thread
    const thread2 = storage.findOrCreateDmThread("did:key:zB", "did:key:zA");
    expect(thread2.threadId).toBe(thread.threadId);
    expect(storage.listDmThreads("did:key:zA")).toHaveLength(1);
    expect(storage.getDmThread(thread.threadId)?.participant2).toBe("did:key:zB");
    storage.setDmThreadStatus(thread.threadId, "accepted");
    expect(storage.getDmThread(thread.threadId)?.status).toBe("accepted");

    storage.addDmMessage({ messageId: "dmm_1", threadId: thread.threadId, from: "did:key:zA", text: "Hi!", seq: 1, createdAt: new Date().toISOString(), signature: "" });
    const msgs = storage.getDmMessages(thread.threadId);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe("Hi!");
  });

  it("records and queries the activity feed", () => {
    storage.addActivity({ activityId: "act_1", actorDid: "did:key:zA", type: "post.created", refId: "pst_1", summary: "Posted something", visibility: "public", createdAt: new Date().toISOString() });
    storage.addActivity({ activityId: "act_2", actorDid: "did:key:zB", type: "agent.joined", refId: "did:key:zB", summary: "Bot B joined", visibility: "public", createdAt: new Date().toISOString() });
    const feed = storage.getActivityFeed();
    expect(feed.length).toBe(2);
  });
});

describe("BlobGatewayStorage snapshot adapter", () => {
  it("reloads persisted SQL state and rejects stale conditional writes", async () => {
    let current: GatewayBlobSnapshot | null = null;
    let nextEtag = 0;
    const blobs: GatewayBlobStore = {
      async read() { return current ? { bytes: Uint8Array.from(current.bytes), etag: current.etag } : null; },
      async write(bytes, expectedEtag) {
        if ((current?.etag ?? undefined) !== expectedEtag) throw new Error("BlobPreconditionFailedError");
        current = { bytes: Uint8Array.from(bytes), etag: `etag-${++nextEtag}` };
        return { etag: current.etag };
      },
    };
    const first = await BlobGatewayStorage.create(blobs);
    const unlockFirst = await first.beginRequest();
    first.appendAudit("first.write", "test", { visibility: "public" });
    await first.commitRequest();
    unlockFirst();

    const second = await BlobGatewayStorage.create(blobs);
    const unlockSecond = await second.beginRequest();
    expect(second.listAudit()).toHaveLength(1);
    const unlockConcurrent = await first.beginRequest();
    first.appendAudit("first.concurrent", "test", {});
    second.appendAudit("second.concurrent", "test", {});
    await first.commitRequest();
    await expect(second.commitRequest()).rejects.toBeInstanceOf(GatewayStorageConflictError);
    unlockSecond();
    unlockConcurrent();

    const recovered = await BlobGatewayStorage.create(blobs);
    expect(recovered.listAudit().map((event) => event.type)).toEqual(["first.concurrent", "first.write"]);
    first.close();
    second.close();
    recovered.close();
  });
});
