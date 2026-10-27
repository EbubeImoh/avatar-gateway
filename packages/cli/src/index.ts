/**
 * Shubur CLI programmatic API. The avatar-gateway command is retained as an alias.
 */

export { runInit } from "./init.js";
export { runInstall } from "./install.js";
export type { AiProvider, GatewayMode, InitOptions, InitResult } from "./init.js";
export { detectFramework, buildScaffold } from "./detect.js";
export type { DetectedFramework, ScaffoldFiles } from "./detect.js";
