import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readLifeStatus } from "./life.js";

const now = new Date("2026-10-28T12:00:00.000Z");

describe("readLifeStatus", () => {
  let cwd: string;

  beforeEach(async () => { cwd = await mkdtemp(join(tmpdir(), "shubur-life-cli-")); });
  afterEach(async () => { await rm(cwd, { recursive: true, force: true }); });

  it("gives a setup hint when no local config exists", async () => {
    expect(await readLifeStatus(cwd, now)).toContain("Run `shubur init` first");
  });

  it("shows local activity and needs without writing config or exposing credentials", async () => {
    const configPath = join(cwd, ".avatar-gateway", "config.json");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(cwd, ".avatar-gateway"), { recursive: true }));
    const original = JSON.stringify({
      gatewayUrl: "http://localhost:4100",
      mode: "self_hosted",
      avatarDid: "did:key:local-agent",
      lifeStartedAt: "2026-10-27T09:00:00.000Z",
      tenantApiKey: "private-tenant-key",
      sitePrivateKeyPem: "PRIVATE KEY do not show",
    }, null, 2);
    await writeFile(configPath, original, { mode: 0o600 });

    const status = await readLifeStatus(cwd, now);
    expect(status).toContain("Current activity:");
    expect(status).toContain("Place: Starter Apartment");
    expect(status).toContain("Needs (0 = satisfied, 100 = urgent):");
    expect(status).toContain("Skills:");
    expect(status).toContain("no LLM, network request, or persistent activity log");
    expect(status).not.toContain("private-tenant-key");
    expect(status).not.toContain("PRIVATE KEY");
    expect(await readFile(configPath, "utf8")).toBe(original);
  });

  it("lives in the owner's saved apartment layout and uses its place name", async () => {
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(cwd, ".avatar-gateway"), { recursive: true }));
    await writeFile(join(cwd, ".avatar-gateway", "config.json"), JSON.stringify({ avatarDid: "did:key:flat-agent", lifeStartedAt: "2026-10-27T09:00:00.000Z" }));
    const apartmentPath = join(cwd, ".avatar-gateway", "apartment.config.json");
    const apartment = JSON.stringify({
      name: "Ada's Loft",
      layout: { startRoom: "studio", rooms: [{ id: "studio", name: "Loft", furniture: ["sofa", "window"] }, { id: "kitchen", name: "Kitchen", furniture: ["island"] }] },
    });
    await writeFile(apartmentPath, apartment);

    const status = await readLifeStatus(cwd, now);
    expect(status).toContain("Place: Ada's Loft · ");
    expect(status).toMatch(/Place: Ada's Loft · (studio|kitchen)\n/);
    expect(status).not.toContain("Starter Apartment");
    expect(await readFile(apartmentPath, "utf8")).toBe(apartment);

    await writeFile(apartmentPath, "[1]");
    await expect(readLifeStatus(cwd, now)).rejects.toThrow("apartment config must contain a JSON object");
  });

  it("does not invent an agent when config has no avatar identity", async () => {
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(cwd, ".avatar-gateway"), { recursive: true }));
    await writeFile(join(cwd, ".avatar-gateway", "config.json"), JSON.stringify({ mode: "self_hosted" }));
    expect(await readLifeStatus(cwd, now)).toContain("No local avatar identity found");
  });

  it("rejects malformed config and invalid start timestamps without modifying the file", async () => {
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(cwd, ".avatar-gateway"), { recursive: true }));
    const configPath = join(cwd, ".avatar-gateway", "config.json");
    await writeFile(configPath, "{");
    await expect(readLifeStatus(cwd, now)).rejects.toThrow("malformed");
    const invalid = JSON.stringify({ avatarDid: "did:key:test", lifeStartedAt: "not-a-date" });
    await writeFile(configPath, invalid);
    await expect(readLifeStatus(cwd, now)).rejects.toThrow("lifeStartedAt is invalid");
    expect(await readFile(configPath, "utf8")).toBe(invalid);
  });
});
