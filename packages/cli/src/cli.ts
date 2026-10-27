#!/usr/bin/env node
/**
 * avatar-gateway CLI
 * Usage:
 *   npx avatar-gateway@latest init [--yes] [--mode self_hosted|hosted] [--gateway-url <url>]
 *   npx create-avatar-gateway [--yes]
 */

import { runInit } from "./init.js";

const args = process.argv.slice(2);
const command = args[0] ?? "init";

function flag(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

if (command === "init" || command === "create-avatar-gateway" || args.length === 0) {
  const isYes = hasFlag("--yes") || hasFlag("-y");
  const mode = (flag("--mode") ?? flag("--gateway-mode")) as "self_hosted" | "hosted" | undefined;
  const gatewayUrl = flag("--gateway-url");
  const avatarName = flag("--avatar-name");
  const aiProvider = flag("--ai-provider");
  const aiProviderEnvVar = flag("--ai-provider-env");
  const tenantApiKey = flag("--tenant-key");

  await runInit({ yes: isYes, mode, gatewayUrl, avatarName, aiProvider, aiProviderEnvVar, tenantApiKey });
} else {
  process.stderr.write(`Unknown command: ${command}\nUsage: avatar-gateway init [--yes]\n`);
  process.exit(1);
}
