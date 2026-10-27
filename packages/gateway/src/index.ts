/**
 * @avatar-gateway/gateway — placeholder entry point.
 * See SPEC.md §5.1 (components) and §7 (API surface).
 */

export type Scope =
  | "chat:send"
  | "chat:receive"
  | "page:read-public"
  | "presence:announce"
  // social scopes (SPEC.md §8.1) — consent-gated and rate-limited
  | "profile:read"
  | "profile:write"
  | "timeline:read"
  | "timeline:post"
  | "follow:write"
  | "dm:send"
  | "dm:receive";

export const GATEWAY_MAX_SCOPES: readonly Scope[] = [
  "chat:send",
  "chat:receive",
  "page:read-public",
  "presence:announce",
  "profile:read",
  "profile:write",
  "timeline:read",
  "timeline:post",
  "follow:write",
  "dm:send",
  "dm:receive",
] as const;

/**
 * The gateway never proxies, meters or resells LLM tokens, and has no route to any owner channel.
 * LLM calls and owner-channel traffic stay on each owner's home backend (BYO key).
 */
export const GATEWAY_HANDLES_LLM_TRAFFIC = false;

/** Visit token claims (PASETO v4.public payload). */
export interface VisitTokenClaims {
  iss: string; // gateway DID
  sub: string; // visitor avatar DID
  aud: string; // host site DID
  vid: string; // visit id
  scp: Scope[];
  iat: number;
  nbf: number;
  exp: number; // iat + <= 300s by default
  jti: string;
  cnf: { jkt: string }; // proof-of-possession key thumbprint
}

export const DEFAULT_TOKEN_TTL_SECONDS = 300;
export const MAX_TOKEN_TTL_SECONDS = 600;

/** Granted = requested ∩ host-offered ∩ gateway-max. */
export function grantScopes(requested: Scope[], hostOffered: Scope[]): Scope[] {
  return requested.filter((s) => hostOffered.includes(s) && GATEWAY_MAX_SCOPES.includes(s));
}

export interface GatewayConfig {
  port: number;
  tls: { certPath: string; keyPath: string; clientCaPath: string };
}

export function createGateway(_config: GatewayConfig): { start(): Promise<void> } {
  return {
    async start() {
      throw new Error("Not implemented yet — see SPEC.md Phase 0.");
    },
  };
}
