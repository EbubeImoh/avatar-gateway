import { describe, expect, it } from "vitest";
import { generateIdentity, signPayload, verifyPayload } from "./identity.js";
import { grantScopes, ScopeDeniedError } from "./policy.js";
import { ChatRelay, RelayPolicyError, signChatFrame } from "./relay.js";
import { issueVisitToken, JtiReplayCache, verifyVisitToken, type VisitTokenClaims } from "./tokens.js";

const NOW_SECONDS = 1_800_000_000;
const NOW_MS = NOW_SECONDS * 1000;

describe("Ed25519 identity", () => {
  it("creates a did:key and verifies signatures only for the matching key", () => {
    const identity = generateIdentity();
    const signature = signPayload("hello", identity.privateKeyPem);
    expect(identity.did).toMatch(/^did:key:z/);
    expect(verifyPayload("hello", signature, identity.publicKeyPem)).toBe(true);
    expect(verifyPayload("changed", signature, identity.publicKeyPem)).toBe(false);
    expect(verifyPayload("hello", signature, generateIdentity().publicKeyPem)).toBe(false);
  });
});

describe("signed visit tokens", () => {
  const gateway = generateIdentity();
  const base = {
    issuer: "did:web:gateway.example",
    subject: "did:key:zVisitor",
    audience: "did:key:zHost",
    visitId: "vst_test",
    scopes: ["chat:send", "chat:receive"] as const,
    proofKeyThumbprint: "sha256:proof-key",
    nowSeconds: NOW_SECONDS,
  };

  it("issues a five-minute audience-bound token and rejects a repeated jti", () => {
    const { token, claims } = issueVisitToken(base, gateway.privateKeyPem);
    expect(claims.exp - claims.iat).toBe(300);
    const cache = new JtiReplayCache();
    expect(verifyVisitToken(token, gateway.publicKeyPem, base.audience, cache, NOW_SECONDS).jti).toBe(claims.jti);
    expect(() => verifyVisitToken(token, gateway.publicKeyPem, base.audience, cache, NOW_SECONDS))
      .toThrowError(expect.objectContaining({ code: "replay_detected" }));
  });

  it("rejects wrong audience, expired tokens, and lifetimes over five minutes", () => {
    const { token } = issueVisitToken(base, gateway.privateKeyPem);
    expect(() => verifyVisitToken(token, gateway.publicKeyPem, "did:key:zOther", new JtiReplayCache(), NOW_SECONDS))
      .toThrowError(expect.objectContaining({ code: "wrong_audience" }));
    expect(() => verifyVisitToken(token, gateway.publicKeyPem, base.audience, new JtiReplayCache(), NOW_SECONDS + 300))
      .toThrowError(expect.objectContaining({ code: "token_expired" }));
    expect(() => issueVisitToken({ ...base, ttlSeconds: 301 }, gateway.privateKeyPem)).toThrow(RangeError);
  });
});

describe("scope policy and chat relay", () => {
  function setup(scopes: VisitTokenClaims["scp"] = ["chat:send", "chat:receive"], limits?: { maxTurns?: number; maxMessageChars?: number; messagesPerMinute?: number }) {
    const visitor = generateIdentity();
    const host = generateIdentity();
    const claims: VisitTokenClaims = {
      iss: "did:web:gateway.example", sub: visitor.did, aud: "did:key:zHostSite", vid: "vst_chat",
      scp: scopes, iat: NOW_SECONDS, nbf: NOW_SECONDS, exp: NOW_SECONDS + 300,
      jti: "token-jti", cnf: { jkt: "sha256:proof" },
    };
    const relay = new ChatRelay();
    relay.openSession({ claims, visitorPublicKeyPem: visitor.publicKeyPem, hostAvatarDid: host.did, hostPublicKeyPem: host.publicKeyPem, limits });
    return { relay, visitor, host, claims };
  }

  it("grants only the intersection and drops unknown scopes", () => {
    expect(grantScopes(["chat:send", "page:read-public", "network:raw"], ["chat:send", "network:raw"]))
      .toEqual(["chat:send"]);
  });

  it("forwards signed text only to the other participant and marks it untrusted", () => {
    const { relay, visitor, host } = setup();
    const received: unknown[] = [];
    relay.subscribe("vst_chat", host.did, (message) => received.push(message));
    const ts = new Date(NOW_MS).toISOString();
    const frame = signChatFrame({ type: "chat.message", visit_id: "vst_chat", seq: 1, from: visitor.did, text: "Hello there", ts }, visitor.privateKeyPem);
    const delivered = relay.send(frame, NOW_MS);
    expect(delivered).toMatchObject({ from: visitor.did, to: host.did, text: "Hello there", untrusted: true });
    expect(received).toEqual([delivered]);
  });

  it("enforces chat scopes, sender signatures, sequence replay, and rate limits", () => {
    const noSendScope = setup(["chat:receive"]);
    const visitorFrame = signChatFrame({ type: "chat.message", visit_id: "vst_chat", seq: 1, from: noSendScope.visitor.did, text: "Hi", ts: new Date(NOW_MS).toISOString() }, noSendScope.visitor.privateKeyPem);
    expect(() => noSendScope.relay.send(visitorFrame, NOW_MS)).toThrow(ScopeDeniedError);

    const { relay, visitor } = setup(["chat:send", "chat:receive"], { messagesPerMinute: 1 });
    const frame = signChatFrame({ type: "chat.message", visit_id: "vst_chat", seq: 1, from: visitor.did, text: "Hi", ts: new Date(NOW_MS).toISOString() }, visitor.privateKeyPem);
    relay.send(frame, NOW_MS);
    expect(() => relay.send(frame, NOW_MS + 1)).toThrowError(expect.objectContaining({ code: "replay_detected" }));
    const second = signChatFrame({ ...frame, seq: 2, ts: new Date(NOW_MS + 2).toISOString() }, visitor.privateKeyPem);
    expect(() => relay.send(second, NOW_MS + 2)).toThrowError(expect.objectContaining({ code: "rate_limited" }));
  });

  it("rejects tampered messages and ended visits", () => {
    const { relay, visitor } = setup();
    const frame = signChatFrame({ type: "chat.message", visit_id: "vst_chat", seq: 1, from: visitor.did, text: "Hi", ts: new Date(NOW_MS).toISOString() }, visitor.privateKeyPem);
    expect(() => relay.send({ ...frame, text: "Altered" }, NOW_MS)).toThrow(RelayPolicyError);
    relay.endVisit("vst_chat");
    expect(() => relay.send(frame, NOW_MS)).toThrowError(expect.objectContaining({ code: "visit_ended" }));
  });
});
