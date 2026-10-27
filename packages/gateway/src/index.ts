/** Gateway security and relay primitives. See SPEC.md §§4, 6, 7, and 8. */

export * from "./identity.js";
export * from "./policy.js";
export * from "./tokens.js";
export * from "./relay.js";

/** The gateway never proxies, meters or resells LLM tokens. */
export const GATEWAY_HANDLES_LLM_TRAFFIC = false;

export interface GatewayConfig {
  port: number;
  tls: { certPath: string; keyPath: string; clientCaPath: string };
}

/** Network server and production mTLS termination remain roadmap work. */
export function createGateway(_config: GatewayConfig): { start(): Promise<void> } {
  return {
    async start() {
      throw new Error("HTTP/mTLS server is not implemented yet; use the gateway primitives directly.");
    },
  };
}
