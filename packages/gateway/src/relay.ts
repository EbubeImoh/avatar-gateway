import { signPayload, verifyPayload } from "./identity.js";
import { assertScope, type Scope } from "./policy.js";
import type { VisitTokenClaims } from "./tokens.js";

export interface ChatFramePayload {
  type: "chat.message"; visit_id: string; seq: number; from: string; text: string; ts: string;
}
export interface SignedChatFrame extends ChatFramePayload { sig: string; }
export interface RelayLimits { maxTurns: number; maxMessageChars: number; messagesPerMinute: number; }
export interface RelaySessionOptions {
  claims: VisitTokenClaims; visitorPublicKeyPem: string; hostAvatarDid: string; hostPublicKeyPem: string;
  limits?: Partial<RelayLimits>;
}
export interface RelayedChatMessage {
  type: "chat.message"; visit_id: string; seq: number; from: string; to: string;
  text: string; untrusted: true; ts: string;
}

const DEFAULT_LIMITS: RelayLimits = { maxTurns: 40, maxMessageChars: 2000, messagesPerMinute: 6 };

export class RelayPolicyError extends Error {
  constructor(readonly code: "visit_ended" | "invalid_frame" | "bad_signature" | "replay_detected" | "rate_limited" | "turn_limit") {
    super(code.replaceAll("_", " "));
    this.name = "RelayPolicyError";
  }
}

interface Session {
  claims: VisitTokenClaims; visitorPublicKeyPem: string; hostAvatarDid: string; hostPublicKeyPem: string;
  limits: RelayLimits; lastSequence: Map<string, number>; messageTimes: Map<string, number[]>;
  visitorTurns: number; listeners: Map<string, Set<(message: RelayedChatMessage) => void>>; active: boolean;
}

/** In-memory chat relay. It stores no history; signed frames are validated and forwarded. */
export class ChatRelay {
  private readonly sessions = new Map<string, Session>();

  openSession(options: RelaySessionOptions): void {
    if (this.sessions.has(options.claims.vid)) throw new RelayPolicyError("invalid_frame");
    this.sessions.set(options.claims.vid, {
      ...options, limits: { ...DEFAULT_LIMITS, ...options.limits }, lastSequence: new Map(),
      messageTimes: new Map(), visitorTurns: 0, listeners: new Map(), active: true,
    });
  }

  subscribe(visitId: string, participantDid: string, listener: (message: RelayedChatMessage) => void): () => void {
    const session = this.getActiveSession(visitId);
    if (participantDid !== session.claims.sub && participantDid !== session.hostAvatarDid) throw new RelayPolicyError("invalid_frame");
    const listeners = session.listeners.get(participantDid) ?? new Set();
    listeners.add(listener);
    session.listeners.set(participantDid, listeners);
    return () => listeners.delete(listener);
  }

  send(frame: SignedChatFrame, nowMs = Date.now()): RelayedChatMessage {
    const session = this.getActiveSession(frame.visit_id);
    if (session.claims.exp <= Math.floor(nowMs / 1000)) throw new RelayPolicyError("visit_ended");
    const isVisitor = frame.from === session.claims.sub;
    const isHost = frame.from === session.hostAvatarDid;
    if ((!isVisitor && !isHost) || frame.type !== "chat.message") throw new RelayPolicyError("invalid_frame");
    const requiredScope: Scope = isVisitor ? "chat:send" : "chat:receive";
    assertScope(session.claims.scp, requiredScope);

    const previousSequence = session.lastSequence.get(frame.from) ?? 0;
    if (!Number.isSafeInteger(frame.seq) || frame.seq <= previousSequence) throw new RelayPolicyError("replay_detected");
    if (typeof frame.text !== "string" || frame.text.trim().length === 0 || [...frame.text].length > session.limits.maxMessageChars) {
      throw new RelayPolicyError("invalid_frame");
    }
    const sentAt = Date.parse(frame.ts);
    if (!Number.isFinite(sentAt) || Math.abs(sentAt - nowMs) > 60_000) throw new RelayPolicyError("invalid_frame");
    const publicKey = isVisitor ? session.visitorPublicKeyPem : session.hostPublicKeyPem;
    const payload = canonicalChatPayload({ type: frame.type, visit_id: frame.visit_id, seq: frame.seq, from: frame.from, text: frame.text, ts: frame.ts });
    if (!verifyPayload(payload, frame.sig, publicKey)) throw new RelayPolicyError("bad_signature");

    const recentTimes = (session.messageTimes.get(frame.from) ?? []).filter((timestamp) => nowMs - timestamp < 60_000);
    if (recentTimes.length >= session.limits.messagesPerMinute) throw new RelayPolicyError("rate_limited");
    if (isVisitor && session.visitorTurns >= session.limits.maxTurns) throw new RelayPolicyError("turn_limit");

    recentTimes.push(nowMs);
    session.messageTimes.set(frame.from, recentTimes);
    session.lastSequence.set(frame.from, frame.seq);
    if (isVisitor) session.visitorTurns += 1;
    const to = isVisitor ? session.hostAvatarDid : session.claims.sub;
    const message: RelayedChatMessage = {
      type: "chat.message", visit_id: frame.visit_id, seq: frame.seq,
      from: frame.from, to, text: frame.text, untrusted: true, ts: frame.ts,
    };
    for (const listener of session.listeners.get(to) ?? []) listener(message);
    return message;
  }

  endVisit(visitId: string): void {
    const session = this.sessions.get(visitId);
    if (session) { session.active = false; session.listeners.clear(); }
  }

  private getActiveSession(visitId: string): Session {
    const session = this.sessions.get(visitId);
    if (!session?.active) throw new RelayPolicyError("visit_ended");
    return session;
  }
}

export function signChatFrame(frame: ChatFramePayload, privateKeyPem: string): SignedChatFrame {
  return { ...frame, sig: signPayload(canonicalChatPayload(frame), privateKeyPem) };
}

function canonicalChatPayload(frame: ChatFramePayload): string {
  return JSON.stringify({ type: frame.type, visit_id: frame.visit_id, seq: frame.seq, from: frame.from, text: frame.text, ts: frame.ts });
}
