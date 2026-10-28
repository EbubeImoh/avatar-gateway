import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInstall } from "./install.js";

describe("Shubur CLI pack install", () => {
  let tempDir: string | undefined;
  afterEach(async () => {
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  });

  it("installs a local signed-format manifest under the project directory", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "shubur-install-test-"));
    const manifestPath = join(tempDir, "pack.json");
    await writeFile(manifestPath, JSON.stringify({
      id: "com.example.starter",
      version: "1.0.0",
      name: "Starter",
      description: "Local test pack",
      author: { name: "Example" },
      licence: "Apache-2.0",
      priceTier: "free",
      categories: ["apartment"],
      compatibility: ">=0.2.0",
      assets: [],
    }));

    const output = await runInstall(manifestPath, tempDir);
    expect(output).toContain("Installed Starter 1.0.0");
    expect(output).toContain(join(tempDir, ".avatar-gateway", "packs"));
  });

  it("requires a pack reference", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "shubur-install-test-"));
    await expect(runInstall("  ", tempDir)).rejects.toThrow("Provide a pack id");
  });
});
