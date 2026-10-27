/**
 * @avatar-gateway/mcp
 *
 * MCP server for avatar-gateway — lets any MCP-compatible agent set up and
 * manage avatars, apartments, Shubur profiles, visits, and gateway config.
 *
 * Run the server:
 *   npx @avatar-gateway/mcp          # stdio (default)
 *   npx @avatar-gateway/mcp --http   # streamable HTTP on port 4200
 *
 * Add to Claude Code (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "avatar-gateway": {
 *         "command": "npx",
 *         "args": ["@avatar-gateway/mcp"]
 *       }
 *     }
 *   }
 *
 * See docs/mcp.md for config snippets for all major agents.
 */

export { readConfig, writeConfig, mergeConfig } from "./config.js";
export type { AvatarGatewayConfig } from "./config.js";
export {
  toolStatus, toolInit, toolCreateIdentity, toolConnectGateway,
  toolRegisterAvatar, toolCreateShuburProfile, toolPost, toolFollow,
  toolDmRequest, toolStartVisit, toolStopVisit, toolInstallPack,
  toolCustomiseApartment,
} from "./tools.js";
