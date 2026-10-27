/**
 * @avatar-gateway/cli — programmatic API for the init command.
 * The CLI binary is at dist/cli.js (bin: avatar-gateway / create-avatar-gateway).
 */

export { runInit } from "./init.js";
export type { InitOptions, InitResult } from "./init.js";
export { detectFramework, buildScaffold } from "./detect.js";
export type { DetectedFramework, ScaffoldFiles } from "./detect.js";
