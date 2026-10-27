import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { detectFramework, buildScaffold } from "./detect.js";
import { runInit } from "./init.js";

// ── detectFramework ────────────────────────────────────────────────────────

describe("detectFramework", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "ag-cli-fw-")); });

  it("detects nextjs", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ dependencies: { next: "15.0.0", react: "19.0.0" } }));
    expect(await detectFramework(tmpDir)).toBe("nextjs");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("detects react-vite", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ dependencies: { react: "18.0.0", vite: "5.0.0" } }));
    expect(await detectFramework(tmpDir)).toBe("react-vite");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("detects vite (no react)", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ devDependencies: { vite: "5.0.0" } }));
    expect(await detectFramework(tmpDir)).toBe("vite");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns plain-html when no package.json", async () => {
    expect(await detectFramework(tmpDir)).toBe("plain-html");
    await rm(tmpDir, { recursive: true, force: true });
  });
});

// ── buildScaffold ──────────────────────────────────────────────────────────

describe("buildScaffold", () => {
  it("returns SDK packages for all frameworks", () => {
    for (const fw of ["nextjs", "react-vite", "vite", "plain-html"] as const) {
      const scaffold = buildScaffold(fw, "TestBot", "/avatar-gateway");
      expect(scaffold.packages).toContain("@avatar-gateway/sdk");
      expect(scaffold.packages).toContain("@avatar-gateway/starter-apartment");
      expect(scaffold.files).toBeTruthy();
    }
  });

  it("includes React component file for nextjs", () => {
    const scaffold = buildScaffold("nextjs", "TestBot", "/avatar-gateway");
    expect(Object.keys(scaffold.files).some((f) => f.endsWith(".tsx"))).toBe(true);
  });

  it("includes HTML file for plain-html", () => {
    const scaffold = buildScaffold("plain-html", "TestBot", "/avatar-gateway");
    expect(Object.keys(scaffold.files).some((f) => f.endsWith(".html"))).toBe(true);
  });
});

// ── runInit (non-interactive) ──────────────────────────────────────────────

describe("runInit --yes", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "ag-cli-init-")); });

  it("writes .avatar-gateway/config.json in --yes mode", async () => {
    const result = await runInit({ yes: true, avatarName: "TestBot", mode: "self_hosted" }, tmpDir);
    expect(result.avatarName).toBe("TestBot");
    expect(result.mode).toBe("self_hosted");
    expect(result.siteDid).toMatch(/^did:key:/);
    expect(result.filesWritten).toContain(".avatar-gateway/config.json");

    const cfg = JSON.parse(await readFile(join(tmpDir, ".avatar-gateway/config.json"), "utf8")) as Record<string, unknown>;
    expect(cfg.siteDid).toBe(result.siteDid);
    expect(cfg.avatarName).toBe("TestBot");
    expect(cfg.sitePrivateKeyPem).toContain("PRIVATE KEY");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("sets hosted mode when specified", async () => {
    const result = await runInit({
      yes: true,
      mode: "hosted",
      gatewayUrl: "https://gateway.example.com",
      tenantApiKey: "ag_testkey",
      avatarName: "HostedBot",
    }, tmpDir);
    expect(result.mode).toBe("hosted");
    expect(result.gatewayUrl).toBe("https://gateway.example.com");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("does not overwrite existing scaffold files", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ dependencies: {} }));
    // First init
    await runInit({ yes: true, avatarName: "Bot1" }, tmpDir);
    // Second init should not throw (flag: "wx" skips existing files)
    await expect(runInit({ yes: true, avatarName: "Bot2" }, tmpDir)).resolves.not.toThrow();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("writes detected framework into result", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ dependencies: { next: "15.0.0", react: "19.0.0" } }));
    const result = await runInit({ yes: true }, tmpDir);
    expect(result.framework).toBe("nextjs");
    await rm(tmpDir, { recursive: true, force: true });
  });
});
