/**
 * Shubur CLI programmatic API. The avatar-gateway command is retained as an alias.
 */

export { runInit } from "./init.js";
export { runInstall } from "./install.js";
export { readLifeStatus } from "./life.js";
export { runNetworkAgentLoop, MockNetworkProvider } from "./network-loop.js";
export type { NetworkLoopOptions, NetworkLoopResult, NetworkToolChoice, NetworkToolName, MockNetworkChoice } from "./network-loop.js";
export type { AiProvider, GatewayMode, InitOptions, InitResult } from "./init.js";
export { detectFramework, buildScaffold } from "./detect.js";
export type { DetectedFramework, LifeScaffoldConfig, ScaffoldFiles } from "./detect.js";
