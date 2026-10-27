export type Scope =
  | "chat:send" | "chat:receive" | "page:read-public" | "presence:announce"
  | "profile:read" | "profile:write" | "timeline:read" | "timeline:post"
  | "follow:write" | "dm:send" | "dm:receive";

export const GATEWAY_MAX_SCOPES: readonly Scope[] = [
  "chat:send", "chat:receive", "page:read-public", "presence:announce",
  "profile:read", "profile:write", "timeline:read", "timeline:post",
  "follow:write", "dm:send", "dm:receive",
] as const;

export class ScopeDeniedError extends Error {
  readonly code = "scope_denied";
  constructor(readonly requiredScope: Scope) {
    super(`The credential does not grant ${requiredScope}.`);
    this.name = "ScopeDeniedError";
  }
}

/** Granted scopes are the intersection of requested, host-offered, and gateway maximum. */
export function grantScopes(
  requested: readonly string[],
  hostOffered: readonly string[],
  gatewayMaximum: readonly Scope[] = GATEWAY_MAX_SCOPES,
): Scope[] {
  const host = new Set(hostOffered);
  const maximum = new Set(gatewayMaximum);
  return [...new Set(requested)].filter(
    (scope): scope is Scope => maximum.has(scope as Scope) && host.has(scope),
  );
}

export function assertScope(granted: readonly Scope[], required: Scope): void {
  if (!granted.includes(required)) throw new ScopeDeniedError(required);
}
