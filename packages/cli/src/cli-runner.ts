import { readFile } from "node:fs/promises";
import { formatInitSummary, runInit } from "./init.js";
import { runInstall } from "./install.js";
import { readLifeStatus } from "./life.js";
import { runNetworkAgentLoop } from "./network-loop.js";
import type { AiProvider } from "./init.js";

export const CLI_HELP = `Shubur — give your AI avatar a home and a life.

Usage:
  shubur [init] [options]
  shubur life [status]
  shubur install <pack-id|https-url|manifest.json> [--registry <https-url>]
  shubur network-loop [options]

Init options:
  --yes, -y                       Run without prompts
  --mode <self_hosted|hosted>     Select gateway mode
  --gateway-url <https-url>      Override the gateway URL
  --ai-provider <name>           openai, anthropic, openai_compatible, or mock
  --ai-provider-env <name>       API key environment variable

Other options:
  --help, -h                     Show this help
  --version, -v                  Show the package version`;

interface CliIO {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
  cwd: string;
}

async function readPackageVersion(): Promise<string> {
  const raw = await readFile(new URL("../package.json", import.meta.url), "utf8");
  const pkg = JSON.parse(raw) as { version?: unknown };
  if (typeof pkg.version !== "string") throw new Error("The Shubur package.json has no version.");
  return pkg.version;
}

export async function runCli(args = process.argv.slice(2), io: CliIO = {
  stdout: process.stdout,
  stderr: process.stderr,
  cwd: process.cwd(),
}): Promise<number> {
  const command = args[0] ?? "init";
  const flag = (name: string): string | undefined => {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };
  const hasFlag = (name: string): boolean => args.includes(name);

  if (command === "help" || command === "--help" || command === "-h") {
    io.stdout.write(`${CLI_HELP}\n`);
    return 0;
  }
  if (command === "--version" || command === "-v") {
    io.stdout.write(`${await readPackageVersion()}\n`);
    return 0;
  }

  if (command === "life") {
    const subcommand = args[1] ?? "status";
    if (subcommand !== "status") {
      io.stderr.write("Usage: shubur life [status]\n");
      return 1;
    }
    io.stdout.write(`${await readLifeStatus(io.cwd)}\n`);
    return 0;
  }

  if (command === "network-loop") {
    const ticks = flag("--ticks") === undefined ? undefined : Number.parseInt(flag("--ticks")!, 10);
    const maxLlmCalls = flag("--max-llm-calls") === undefined ? undefined : Number.parseInt(flag("--max-llm-calls")!, 10);
    if ((ticks !== undefined && (!Number.isInteger(ticks) || ticks < 1)) ||
        (maxLlmCalls !== undefined && (!Number.isInteger(maxLlmCalls) || maxLlmCalls < 1))) {
      io.stderr.write("--ticks and --max-llm-calls must be positive integers.\n");
      return 1;
    }
    const result = await runNetworkAgentLoop(flag("--site") ?? io.cwd, {
      maxTicks: ticks,
      maxLlmCalls,
      transcriptPath: flag("--transcript"),
    });
    io.stdout.write(`Network loop complete for ${result.agentDid}.\nProvider: ${result.provider}\nTicks: ${result.ticks}\nTranscript: ${result.transcriptPath}\n`);
    return 0;
  }

  if (command === "install") {
    const packReference = args[1];
    if (!packReference) {
      io.stderr.write("Usage: shubur install <pack-id|https-url|local-manifest.json> [--registry <https-url>]\n");
      return 1;
    }
    io.stdout.write(`${await runInstall(packReference, io.cwd, flag("--registry"))}\n`);
    return 0;
  }

  if (command === "init" || command === "create-avatar-gateway" || args.length === 0) {
    const isYes = hasFlag("--yes") || hasFlag("-y");
    const mode = (flag("--mode") ?? flag("--gateway-mode")) as "self_hosted" | "hosted" | undefined;
    const result = await runInit({
      yes: isYes,
      mode,
      gatewayUrl: flag("--gateway-url"),
      avatarName: flag("--avatar-name"),
      aiProvider: flag("--ai-provider") as AiProvider | undefined,
      aiProviderEnvVar: flag("--ai-provider-env"),
      tenantApiKey: flag("--tenant-key"),
      siteOrigin: flag("--site-origin"),
    }, io.cwd);
    if (isYes) io.stdout.write(`${formatInitSummary(result)}\n`);
    return 0;
  }

  io.stderr.write(`Unknown command: ${command}\nRun \`shubur --help\` to see available commands.\n`);
  return 1;
}
