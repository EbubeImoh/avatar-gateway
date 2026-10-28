/** Read-only CLI projection of the local agent life state. */

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { createLifeSimulation, formatLifeStatus } from "@shubur/life";
import type { LifeSimulationOptions } from "@shubur/life";

const CONFIG_PATH = ".avatar-gateway/config.json";
const APARTMENT_PATH = ".avatar-gateway/apartment.config.json";

type ApartmentConfig = NonNullable<LifeSimulationOptions["apartment"]>;

interface LifeConfig {
  avatarDid?: string;
  lifeStartedAt?: string;
}

async function readLifeConfig(cwd: string): Promise<LifeConfig | null> {
  let raw: string;
  try {
    raw = await readFile(join(cwd, CONFIG_PATH), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; }
  catch { throw new Error("Shubur config is malformed; it was left unchanged."); }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Shubur config must contain a JSON object; it was left unchanged.");
  }
  return parsed as LifeConfig;
}

/** The owner's saved apartment, if they customised one; the agent lives in that layout. */
async function readApartment(cwd: string): Promise<ApartmentConfig | undefined> {
  let raw: string;
  try {
    raw = await readFile(join(cwd, APARTMENT_PATH), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; }
  catch { throw new Error("Shubur apartment config is malformed; it was left unchanged."); }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Shubur apartment config must contain a JSON object; it was left unchanged.");
  }
  return parsed as ApartmentConfig;
}

async function startedAtFor(config: LifeConfig, cwd: string, now: Date): Promise<Date> {
  if (config.lifeStartedAt !== undefined) {
    const startedAt = new Date(config.lifeStartedAt);
    if (!Number.isFinite(startedAt.getTime())) throw new Error("Shubur lifeStartedAt is invalid; config was left unchanged.");
    return startedAt;
  }
  const file = await stat(join(cwd, CONFIG_PATH));
  const storedTime = file.birthtimeMs > 0 ? file.birthtime : file.mtime;
  if (!Number.isFinite(storedTime.getTime()) || storedTime.getTime() > now.getTime()) {
    throw new Error("Cannot infer when this Shubur config was created; rerun shubur init to start local life.");
  }
  return storedTime;
}

/** Read config and the saved apartment, then project the current local life without writing files or calling a gateway. */
export async function readLifeStatus(cwd = process.cwd(), now = new Date()): Promise<string> {
  const config = await readLifeConfig(cwd);
  if (!config) return "No Shubur config found in this directory. Run `shubur init` first.";
  if (typeof config.avatarDid !== "string" || !config.avatarDid.startsWith("did:key:")) {
    return "No local avatar identity found. Run `shubur init` before viewing agent life.";
  }
  const startedAt = await startedAtFor(config, cwd, now);
  const apartment = await readApartment(cwd);
  const simulation = createLifeSimulation({
    agentId: config.avatarDid,
    seed: config.avatarDid,
    ...(apartment ? { apartment } : {}),
    startedAt,
    clock: () => new Date(now.getTime()),
  });
  return formatLifeStatus(simulation.advanceTo(now));
}
