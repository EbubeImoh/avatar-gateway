#!/usr/bin/env node
/**
 * Shubur CLI
 * Usage:
 *   npx shubur@latest init [--yes] [--mode self_hosted|hosted] [--gateway-url <url>]
 *   npx avatar-gateway init [--yes] (compatibility alias after publishing)
 *   npx create-avatar-gateway [--yes]
 */

import { formatInitSummary, runInit } from "./init.js";
import { runInstall } from "./install.js";
import type { AiProvider } from "./init.js";

const args = process.argv.slice(2);
const command = args[0] ?? "init";

function flag(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

if (command === "install") {
  const packReference = args[1];
  if (!packReference) {
    process.stderr.write("Usage: shubur install <pack-id|https-url|local-manifest.json> [--registry <https-url>]\n");
    process.exit(1);
  }
  await runInstall(packReference, process.cwd(), flag("--registry"));
} else if (command === "init" || command === "create-avatar-gateway" || args.length === 0) {
  const isYes = hasFlag("--yes") || hasFlag("-y");
  const mode = (flag("--mode") ?? flag("--gateway-mode")) as "self_hosted" | "hosted" | undefined;
  const gatewayUrl = flag("--gateway-url");
  const avatarName = flag("--avatar-name");
  const aiProvider = flag("--ai-provider") as AiProvider | undefined;
  const aiProviderEnvVar = flag("--ai-provider-env");
  const tenantApiKey = flag("--tenant-key");
  const siteOrigin = flag("--site-origin");

  const result = await runInit({ yes: isYes, mode, gatewayUrl, avatarName, aiProvider, aiProviderEnvVar, tenantApiKey, siteOrigin });
  if (isYes) process.stdout.write(`${formatInitSummary(result)}\n`);
} else {
  process.stderr.write(`Unknown command: ${command}\nUsage: shubur init [--yes] | shubur install <pack-id|https-url|local-manifest.json>\n`);
  process.exit(1);
}
