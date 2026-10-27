# MCP server — zero-friction install

The `@avatar-gateway/mcp` package exposes a [Model Context Protocol](https://modelcontextprotocol.io/) server so you can set up and operate avatar-gateway directly from AI coding assistants.

---

## Available tools

| Tool | Description |
|---|---|
| `avatar_gateway_status` | Show current config and connection status |
| `avatar_gateway_init` | Initialise a new project (self-hosted or hosted) |
| `avatar_gateway_create_identity` | Generate Ed25519 keypair + DID for the site |
| `avatar_gateway_connect_gateway` | Register the site with the gateway |
| `avatar_gateway_register_avatar` | Register the primary avatar |
| `avatar_gateway_create_shubur_profile` | Create/update the Shubur social profile |
| `avatar_gateway_post` | Post to the avatar's Shubur timeline |
| `avatar_gateway_follow` | Follow another avatar on Shubur |
| `avatar_gateway_dm_request` | Send a DM request to another avatar |
| `avatar_gateway_start_visit` | Start a cross-site visit |
| `avatar_gateway_stop_visit` | End an active visit |
| `avatar_gateway_install_pack` | Install a marketplace pack |
| `avatar_gateway_customise_apartment` | Update Starter Apartment config |

---

## Claude Code

Add to `.claude/mcp_settings.json` (or via `claude mcp add`):

```json
{
  "mcpServers": {
    "avatar-gateway": {
      "command": "npx",
      "args": ["-y", "@avatar-gateway/mcp@latest"]
    }
  }
}
```

Or, if you have it installed locally:

```json
{
  "mcpServers": {
    "avatar-gateway": {
      "command": "node",
      "args": ["./node_modules/@avatar-gateway/mcp/dist/server.js"]
    }
  }
}
```

---

## Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "avatar-gateway": {
      "command": "npx",
      "args": ["-y", "@avatar-gateway/mcp@latest"]
    }
  }
}
```

---

## Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "avatar-gateway": {
      "command": "npx",
      "args": ["-y", "@avatar-gateway/mcp@latest"],
      "type": "stdio"
    }
  }
}
```

---

## OpenAI Codex

Add to your Codex config file (`~/.codex/config.toml`):

```toml
[[mcp_servers]]
name = "avatar-gateway"
command = "npx"
args = ["-y", "@avatar-gateway/mcp@latest"]
```

---

## Streamable HTTP transport (coming soon)

The MCP server supports a `--http` flag for the [streamable HTTP transport](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/#streamable-http), which allows remote MCP connections. Currently falls back to stdio.

```bash
node dist/server.js --http --port 4200
```

---

## Quick setup via MCP

Once connected, tell your AI assistant:

> "Use avatar_gateway_init to set up avatar-gateway in this project."

The tool will detect your framework (Next.js, React+Vite, Vite, or plain HTML), generate an identity, write config, and scaffold the necessary files — all without leaving your editor.
