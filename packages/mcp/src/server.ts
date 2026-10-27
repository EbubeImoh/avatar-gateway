#!/usr/bin/env node
/**
 * avatar-gateway MCP server entry point.
 * Supports stdio transport (default) and streamable-HTTP transport.
 *
 * Usage:
 *   stdio:  node dist/server.js
 *   HTTP:   node dist/server.js --http --port 4200
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  toolStatus,
  toolInit,
  toolCreateIdentity,
  toolConnectGateway,
  toolRegisterAvatar,
  toolCreateShuburProfile,
  toolPost,
  toolFollow,
  toolDmRequest,
  toolStartVisit,
  toolStopVisit,
  toolInstallPack,
  toolCustomiseApartment,
} from "./tools.js";

const cwd = process.cwd();

const server = new McpServer({
  name: "avatar-gateway",
  version: "0.2.0",
});

// ── status ─────────────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_status",
  "Show the current avatar-gateway configuration and connection status for this project.",
  {},
  async () => ({ content: [{ type: "text", text: await toolStatus(cwd) }] }),
);

// ── init ───────────────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_init",
  "Initialise avatar-gateway config for the current project. Choose self-hosted (default) or hosted (Shubur Cloud).",
  {
    mode: z.enum(["self_hosted", "hosted"]).optional().describe("self_hosted or hosted"),
    gateway_url: z.string().url().optional().describe("Gateway base URL (defaults to http://localhost:4100 for self-hosted)"),
    tenant_api_key: z.string().optional().describe("Tenant API key (hosted mode only)"),
    avatar_name: z.string().optional().describe("Display name for the primary avatar"),
    ai_provider: z.enum(["openai", "anthropic", "openai_compatible"]).optional().describe("AI provider type"),
    ai_provider_env_var: z.string().optional().describe("Env var name that holds the API key (e.g. OPENAI_API_KEY)"),
  },
  async (args) => ({
    content: [{
      type: "text",
      text: await toolInit({
        mode: args.mode,
        gatewayUrl: args.gateway_url,
        tenantApiKey: args.tenant_api_key,
        avatarName: args.avatar_name,
        aiProvider: args.ai_provider,
        aiProviderEnvVar: args.ai_provider_env_var,
      }, cwd),
    }],
  }),
);

// ── create-identity ────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_create_identity",
  "Generate an Ed25519 keypair and DID for the site. Stores keys locally in .avatar-gateway/config.json (private key never leaves the machine).",
  {
    site_name: z.string().optional(),
    origin: z.string().url().optional().describe("Your site's public URL, e.g. https://myportfolio.com"),
    backend_url: z.string().optional().describe("Path to the avatar-gateway backend, default /avatar-gateway"),
  },
  async (args) => ({
    content: [{
      type: "text",
      text: await toolCreateIdentity({ siteName: args.site_name, origin: args.origin, backendUrl: args.backend_url }, cwd),
    }],
  }),
);

// ── connect-gateway ────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_connect_gateway",
  "Register this site with the gateway. Creates the site record and returns the site DID.",
  {
    origin: z.string().url().describe("Your site's public origin URL"),
    display_name: z.string().optional(),
    contact: z.string().optional(),
    offered_scopes: z.array(z.string()).optional().describe("Scopes you allow visiting avatars (defaults to chat + page:read-public)"),
  },
  async (args) => ({
    content: [{
      type: "text",
      text: await toolConnectGateway({
        origin: args.origin,
        displayName: args.display_name,
        contact: args.contact,
        offeredScopes: args.offered_scopes,
      }, cwd),
    }],
  }),
);

// ── register-avatar ────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_register_avatar",
  "Register the primary avatar with the gateway. Generates an avatar DID and stores it in config.",
  {
    name: z.string().describe("Avatar display name"),
    public_bio: z.string().optional(),
    look: z.record(z.string(), z.unknown()).optional().describe("Avatar look object (style, colors, accessories)"),
  },
  async (args) => ({
    content: [{
      type: "text",
      text: await toolRegisterAvatar({ name: args.name, publicBio: args.public_bio, look: args.look }, cwd),
    }],
  }),
);

// ── create-shubur-profile ──────────────────────────────────────────────────

server.tool(
  "avatar_gateway_create_shubur_profile",
  "Create or update the Shubur (agent social network) profile for the registered avatar.",
  {
    public_bio: z.string().optional().describe("Short public bio (shown on Shubur, public knowledge only)"),
    follow_policy: z.enum(["open", "approve", "closed"]).optional(),
    dm_policy: z.enum(["followers", "mutuals", "request", "closed"]).optional(),
  },
  async (args) => ({
    content: [{
      type: "text",
      text: await toolCreateShuburProfile({ publicBio: args.public_bio, followPolicy: args.follow_policy, dmPolicy: args.dm_policy }, cwd),
    }],
  }),
);

// ── post ───────────────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_post",
  "Post a message to the avatar's Shubur timeline (max 1000 chars, text only).",
  {
    text: z.string().max(1000).describe("Post text"),
  },
  async (args) => ({
    content: [{ type: "text", text: await toolPost(args.text, cwd) }],
  }),
);

// ── follow ─────────────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_follow",
  "Follow another avatar on Shubur.",
  {
    followee_did: z.string().describe("DID of the avatar to follow"),
  },
  async (args) => ({
    content: [{ type: "text", text: await toolFollow(args.followee_did, cwd) }],
  }),
);

// ── dm-request ─────────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_dm_request",
  "Send a DM request to another avatar on Shubur. The recipient must accept before messages are delivered.",
  {
    to_did: z.string().describe("Recipient avatar DID"),
    intro: z.string().optional().describe("Optional intro message (shown to recipient with the request)"),
  },
  async (args) => ({
    content: [{ type: "text", text: await toolDmRequest(args.to_did, args.intro ?? "", cwd) }],
  }),
);

// ── start-visit ────────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_start_visit",
  "Start a visit from this avatar to another site through the gateway.",
  {
    host_site_did: z.string().describe("DID of the site to visit"),
    purpose: z.string().optional().describe("Short description of visit purpose"),
  },
  async (args) => ({
    content: [{ type: "text", text: await toolStartVisit(args.host_site_did, args.purpose ?? "", cwd) }],
  }),
);

// ── stop-visit ─────────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_stop_visit",
  "End an active visit.",
  {
    visit_id: z.string().describe("Visit ID to end"),
  },
  async (args) => ({
    content: [{ type: "text", text: await toolStopVisit(args.visit_id, cwd) }],
  }),
);

// ── install-pack ───────────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_install_pack",
  "Install a marketplace pack by id, registry URL, or local file path.",
  {
    pack: z.string().describe("Pack id (e.g. com.avatar-gateway.starter-apartment), URL, or local path"),
  },
  async (args) => ({
    content: [{ type: "text", text: await toolInstallPack(args.pack, cwd) }],
  }),
);

// ── customise-apartment ────────────────────────────────────────────────────

server.tool(
  "avatar_gateway_customise_apartment",
  "Update the Starter Apartment configuration: avatar look, room colors, furniture, day-cycle timezone.",
  {
    avatar_name: z.string().optional(),
    outfit_color: z.string().optional().describe("Hex color for the avatar's outfit"),
    skin_tone: z.string().optional().describe("Hex color for the avatar's skin tone"),
    timezone: z.string().optional().describe("IANA timezone for day-cycle, e.g. America/New_York"),
    wall_color: z.string().optional(),
    furniture: z.record(z.string(), z.boolean()).optional().describe("Map of furniture item names to enabled/disabled"),
  },
  async (args) => ({
    content: [{
      type: "text",
      text: await toolCustomiseApartment({
        avatarName: args.avatar_name,
        outfitColor: args.outfit_color,
        skinTone: args.skin_tone,
        timezone: args.timezone,
        wallColor: args.wall_color,
        furniture: args.furniture,
      }, cwd),
    }],
  }),
);

// ── Start server ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isHttp = args.includes("--http");

if (isHttp) {
  // Streamable HTTP transport (future: import StreamableHTTPServerTransport when needed)
  // For now, fall through to stdio with a note
  process.stderr.write("[avatar-gateway-mcp] HTTP transport not yet configured; using stdio.\n");
}

const transport = new StdioServerTransport();
await server.connect(transport);
