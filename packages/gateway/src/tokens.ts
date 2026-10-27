import { randomUUID } from "node:crypto";
import { signPayload, verifyPayload } from "./identity.js";
import { GATEWAY_MAX_SCOPES, type Scope } from "./policy.js";

export const DEFAULT_TOKEN_TTL_SECONDS = 300;
export const MAX_TOKEN_TTL_SECONDS = 300;

export interface VisitTokenClaims {
  iss: string; sub: string; aud: string; vid: string; scp: Scope[];
  iat: number; nbf: number; exp: number; jti: string; cnf: { jkt: string };
}

export interface IssueVisitTokenOptions {
  issuer: string; subject: string; audience: string; visitId: string;
  scopes: readonly Scope[]; proofKeyThumbprint: string;
  ttlSeconds?: number; nowSeconds?: number;
}

export class TokenValidationError extends Error {
  constructor(readonly code: "invalid_token" | "token_expired" | "wrong_audience" | "replay_detected") {
    super(code.replaceAll("_", " "));
    this.name = "TokenValidationError";
  }
}

/** In-memory one-use jti cache. Replace with a shared atomic store in a multi-instance gateway. */
export class JtiReplayCache {
  private readonly seen = new Map<string, number>();

  consume(jti: string, expiresAtSeconds: number, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
    for (const [knownJti, expiry] of this.seen) if (expiry <= nowSeconds) this.seen.delete(knownJti);
    if (this.seen.has(jti)) return false;
    this.seen.set(jti, expiresAtSeconds);
    return true;
  }

  get size(): number { return this.seen.size; }
}

/** Issue an EdDSA compact JWS token with a hard five-minute maximum TTL. */
export function issueVisitToken(
  options: IssueVisitTokenOptions,
  gatewayPrivateKeyPem: string,
): { token: string; claims: VisitTokenClaims } {
  const ttl = options.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > MAX_TOKEN_TTL_SECONDS) {
    throw new RangeError(`Visit token TTL must be between 1 and ${MAX_TOKEN_TTL_SECONDS} seconds.`);
  }
  if (options.scopes.some((scope) => !GATEWAY_MAX_SCOPES.includes(scope))) {
    throw new TypeError("Visit token contains a scope outside the gateway maximum.");
  }
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const claims: VisitTokenClaims = {
    iss: options.issuer, sub: options.subject, aud: options.audience,
    vid: options.visitId, scp: [...new Set(options.scopes)],
    iat: now, nbf: now, exp: now + ttl, jti: randomUUID(),
    cnf: { jkt: options.proofKeyThumbprint },
  };
  const header = encodeJson({ alg: "EdDSA", typ: "JWT" });
  const payload = encodeJson(claims);
  const signingInput = `${header}.${payload}`;
  return { token: `${signingInput}.${signPayload(signingInput, gatewayPrivateKeyPem)}`, claims };
}

/** Validate signature, audience, expiry, TTL, required claims, and one-use jti. */
export function verifyVisitToken(
  token: string,
  gatewayPublicKeyPem: string,
  expectedAudience: string,
  replayCache: JtiReplayCache,
  nowSeconds = Math.floor(Date.now() / 1000),
): VisitTokenClaims {
  const parts = token.split(".");
  if (parts.length !== 3) throw new TokenValidationError("invalid_token");
  const [encodedHeader, encodedPayload, signature] = parts;
  try {
    const header = decodeJson(encodedHeader) as { alg?: unknown; typ?: unknown };
    if (header.alg !== "EdDSA" || header.typ !== "JWT") throw new Error("Unexpected token header");
    if (!verifyPayload(`${encodedHeader}.${encodedPayload}`, signature, gatewayPublicKeyPem)) throw new Error("Bad token signature");
    const claims = decodeJson(encodedPayload) as VisitTokenClaims;
    if (!isValidClaims(claims)) throw new Error("Invalid claims");
    if (claims.aud !== expectedAudience) throw new TokenValidationError("wrong_audience");
    if (claims.nbf > nowSeconds + 60 || claims.iat > nowSeconds + 60) throw new TokenValidationError("invalid_token");
    if (claims.exp <= nowSeconds) throw new TokenValidationError("token_expired");
    if (claims.exp <= claims.iat || claims.nbf > claims.exp || claims.iat > claims.nbf || claims.exp - claims.iat > MAX_TOKEN_TTL_SECONDS) {
      throw new TokenValidationError("invalid_token");
    }
    if (!replayCache.consume(claims.jti, claims.exp, nowSeconds)) throw new TokenValidationError("replay_detected");
    return claims;
  } catch (error) {
    if (error instanceof TokenValidationError) throw error;
    throw new TokenValidationError("invalid_token");
  }
}

function isValidClaims(value: VisitTokenClaims): boolean {
  return Boolean(
    value && typeof value.iss === "string" && value.iss.length > 0 &&
    typeof value.sub === "string" && value.sub.length > 0 &&
    typeof value.aud === "string" && value.aud.length > 0 &&
    typeof value.vid === "string" && value.vid.length > 0 &&
    Array.isArray(value.scp) && value.scp.every((scope) => GATEWAY_MAX_SCOPES.includes(scope)) &&
    Number.isInteger(value.iat) && Number.isInteger(value.nbf) && Number.isInteger(value.exp) &&
    typeof value.jti === "string" && value.jti.length > 0 &&
    value.cnf && typeof value.cnf.jkt === "string" && value.cnf.jkt.length > 0
  );
}

function encodeJson(value: unknown): string { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function decodeJson(value: string): unknown { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown; }
