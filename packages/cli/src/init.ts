/**
 * avatar-gateway CLI init command.
 * Interactive (readline) + non-interactive (--yes / CI) mode.
 */

import { createInterface } from "node:readline/promises";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { detectFramework, buildScaffold } from "./detect.js";
import { generateIdentity } from "@avatar-gateway/gateway";

export interface InitOptions {
  yes?: boolean;
  mode?: "self_hosted" | "hosted";
  gatewayUrl?: string;
  avatarName?: string;
  aiProvider?: string;
  aiProviderEnvVar?: string;
  tenantApiKey?: string;
  backendPath?: string;
}

export interface InitResult {
  framework: string;
  siteDid: string;
  avatarName: string;
  mode: string;
  gatewayUrl: string;
  filesWritten: string[];
}

export async function runInit(opts: InitOptions = {}, cwd = process.cwd()): Promise<InitResult> {
  const isYes = opts.yes ?? false;
  let rl: ReturnType<typeof createInterface> | undefined;

  async function ask(prompt: string, defaultValue: string): Promise<string> {
    if (isYes || opts.yes) return defaultValue;
    if (!rl) {
      rl = createInterface({ input: process.stdin, output: process.stdout });
    }
    const answer = await rl.question(`${prompt} [${defaultValue}]: `);
    return answer.trim() || defaultValue;
  }

  const framework = await detectFramework(cwd);
  const detectedLabel = framework === "unknown" ? "plain-html" : framework;

  if (!isYes) process.stdout.write(`\n🧱 avatar-gateway init\n\nDetected framework: ${detectedLabel}\n\n`);

  const mode = opts.mode
    ?? (await ask("Gateway mode? (self_hosted / hosted)", "self_hosted") as InitOptions["mode"])
    ?? "self_hosted";

  const gatewayUrl = opts.gatewayUrl
    ?? (mode === "hosted"
      ? await ask("Hosted gateway URL", "https://gateway.avatar-gateway.dev")
      : await ask("Self-hosted gateway URL", "http://localhost:4100"));

  const avatarName = opts.avatarName ?? await ask("Avatar name", "My Avatar");
  const backendPath = opts.backendPath ?? await ask("Backend path", "/avatar-gateway");
  const aiProvider = opts.aiProvider ?? await ask("AI provider (openai / anthropic / openai_compatible)", "openai");
  const aiEnvVar = opts.aiProviderEnvVar ?? await ask(
    "API key env var name",
    aiProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY",
  );

  rl?.close();

  // Generate identity
  const identity = generateIdentity();

  // Build scaffold
  const scaffold = buildScaffold(framework, avatarName, backendPath);

  // Write scaffold files
  const filesWritten: string[] = [];
  for (const [relPath, content] of Object.entries(scaffold.files)) {
    const absPath = join(cwd, relPath);
    await mkdir(join(absPath, ".."), { recursive: true });
    try {
      await writeFile(absPath, content, { flag: "wx" }); // don't overwrite existing
      filesWritten.push(relPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }

  // Write config
  const configDir = join(cwd, ".avatar-gateway");
  await mkdir(configDir, { recursive: true });
  const config = {
    gatewayUrl,
    mode,
    tenantApiKey: opts.tenantApiKey,
    siteDid: identity.did,
    sitePrivateKeyPem: identity.privateKeyPem,
    sitePublicKeyPem: identity.publicKeyPem,
    avatarName,
    aiProvider,
    aiProviderEnvVar: aiEnvVar,
    backendUrl: backendPath,
  };
  await writeFile(join(configDir, "config.json"), JSON.stringify(config, null, 2) + "\n");
  filesWritten.push(".avatar-gateway/config.json");

  // Print summary
  if (!isYes) {
    process.stdout.write(`\n✅ Done!\n\n`);
    process.stdout.write(`  Site DID: ${identity.did}\n`);
    process.stdout.write(`  Gateway:  ${gatewayUrl} (${mode})\n`);
    if (filesWritten.length) {
      process.stdout.write(`\n  Files written:\n`);
      for (const f of filesWritten) process.stdout.write(`    ${f}\n`);
    }
    process.stdout.write(`\n  Packages to install:\n`);
    process.stdout.write(`    npm install ${scaffold.packages.join(" ")}\n`);
    process.stdout.write(`\n  Next steps:\n`);
    for (const step of scaffold.instructions) process.stdout.write(`    ${step}\n`);
    process.stdout.write("\n");
  }

  return { framework: detectedLabel, siteDid: identity.did, avatarName, mode, gatewayUrl, filesWritten };
}
