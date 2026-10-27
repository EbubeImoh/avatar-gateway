/** Gateway security, relay primitives, server, and storage. See SPEC.md §§4, 6, 7, and 8. */

export * from "./identity.js";
export * from "./policy.js";
export * from "./tokens.js";
export * from "./relay.js";
export * from "./storage.js";
export * from "./server.js";

/** The gateway never proxies, meters or resells LLM tokens. */
export const GATEWAY_HANDLES_LLM_TRAFFIC = false;
