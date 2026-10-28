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
import { readLifeStatus } from "./life.js";
import { runNetworkAgentLoop } from "./network-loop.js";
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

if (command === "life") {
  const subcommand = args[1] ?? "status";
  if (subcommand !== "status") {
    process.stderr.write("Usage: shubur life [status]\n");
    process.exit(1);
  }
  process.stdout.write(`${await readLifeStatus(process.cwd())}\n`);
} else if (command === "network-loop") {
  const ticks = flag("--ticks") === undefined ? undefined : Number.parseInt(flag("--ticks")!, 10);
  const maxLlmCalls = flag("--max-llm-calls") === undefined ? undefined : Number.parseInt(flag("--max-llm-calls")!, 10);
  if ((ticks !== undefined && (!Number.isInteger(ticks) || ticks < 1)) ||
      (maxLlmCalls !== undefined && (!Number.isInteger(maxLlmCalls) || maxLlmCalls < 1))) {
    process.stderr.write("--ticks and --max-llm-calls must be positive integers.\n");
    process.exit(1);
  }
  const result = await runNetworkAgentLoop(flag("--site") ?? process.cwd(), {
    maxTicks: ticks,
    maxLlmCalls,
    transcriptPath: flag("--transcript"),
  });
  process.stdout.write(`Network loop complete for ${result.agentDid}.\nProvider: ${result.provider}\nTicks: ${result.ticks}\nTranscript: ${result.transcriptPath}\n`);
} else if (command === "install") {
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
  process.stderr.write(`Unknown command: ${command}\nUsage: shubur init [--yes] | shubur life [status] | shubur network-loop [--site <path>] [--ticks 8] [--max-llm-calls 40] | shubur install <pack-id|https-url|local-manifest.json>\n`);
  process.exit(1);
}
