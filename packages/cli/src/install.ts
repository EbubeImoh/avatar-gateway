/** Install a Shubur Marketplace manifest from a registry id, HTTPS URL, or local JSON file. */

import { resolve } from "node:path";
import { PackRegistry } from "@avatar-gateway/marketplace";
import { DEFAULT_INSTALL_DIR, DEFAULT_REGISTRY_URL } from "@avatar-gateway/marketplace";

export async function runInstall(packReference: string, cwd = process.cwd(), registryUrl = process.env.SHUBUR_REGISTRY_URL ?? DEFAULT_REGISTRY_URL): Promise<string> {
  if (!packReference.trim()) throw new Error("Provide a pack id, HTTPS URL, or local manifest path.");
  const resolvedReference = packReference.startsWith("./") || packReference.startsWith("../")
    ? resolve(cwd, packReference)
    : packReference;
  const registry = new PackRegistry(registryUrl, resolve(cwd, DEFAULT_INSTALL_DIR));
  const pack = await registry.install(resolvedReference);
  return `Installed ${pack.name} ${pack.version} (${pack.id})\nPath: ${pack.installPath}`;
}
