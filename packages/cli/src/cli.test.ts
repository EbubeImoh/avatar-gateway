import { describe, it, expect, beforeEach, vi } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, readFile, writeFile, stat } from "node:fs/promises";
import { detectFramework, buildScaffold } from "./detect.js";
import { formatInitSummary, runInit } from "./init.js";

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
      expect(scaffold.packages).toContain("@shubur/life");
      expect(scaffold.files).toBeTruthy();
    }
  });

  it("includes React component file for nextjs", () => {
    const scaffold = buildScaffold("nextjs", "TestBot", "/avatar-gateway");
    expect(Object.keys(scaffold.files).some((f) => f.endsWith(".tsx"))).toBe(true);
  });

  it("includes HTML file for plain-html", () => {
    const scaffold = buildScaffold("plain-html", "TestBot", "/avatar-gateway");
    expect(scaffold.files["index.html"]).toContain("Avatar.mount");
    expect(scaffold.files["index.html"]).toContain('from "@avatar-gateway/starter-apartment"');
    expect(scaffold.files["index.html"]).toContain('from "@shubur/life"');
    expect(scaffold.files["index.html"]).toContain('mount("#apartment", { avatar: { name: "TestBot" } }, life)');
    expect(scaffold.packages).toContain("vite");
  });

  it("generates a usable React component with Avatar.mount", () => {
    const scaffold = buildScaffold("nextjs", "TestBot", "/avatar-gateway");
    expect(scaffold.files["app/avatar/page.tsx"]).toContain("Avatar.mount");
    expect(scaffold.files["app/avatar/page.tsx"]).not.toContain("@avatar-gateway/sdk/next");
  });
});

// ── runInit (non-interactive) ──────────────────────────────────────────────

describe("runInit --yes", () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), "ag-cli-init-")); });

  it("writes .avatar-gateway/config.json in --yes mode", async () => {
    const result = await runInit({ yes: true, avatarName: "TestBot", mode: "self_hosted", installPackages: false, connectGateway: false }, tmpDir);
    expect(result.avatarName).toBe("TestBot");
    expect(result.mode).toBe("self_hosted");
    expect(result.siteDid).toMatch(/^did:key:/);
    expect(result.filesWritten).toContain(".avatar-gateway/config.json");

    const cfg = JSON.parse(await readFile(join(tmpDir, ".avatar-gateway/config.json"), "utf8")) as Record<string, unknown>;
    expect(cfg.siteDid).toBe(result.siteDid);
    expect(cfg.avatarName).toBe("TestBot");
    expect(cfg.sitePrivateKeyPem).toContain("PRIVATE KEY");
    expect(cfg.avatarDid).toBe(result.avatarDid);
    expect(cfg.lifeStartedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(cfg.shuburHandle).toContain("@localhost");
    expect(result.profilePublished).toBe(false);
    const configStat = await stat(join(tmpDir, ".avatar-gateway/config.json"));
    expect(configStat.mode & 0o777).toBe(0o600);
    expect(await readFile(join(tmpDir, ".avatar-gateway/profile.json"), "utf8")).toContain("TestBot");
    expect(await readFile(join(tmpDir, ".gitignore"), "utf8")).toContain(".avatar-gateway/");
    const generated = await readFile(join(tmpDir, "index.html"), "utf8");
    expect(generated).toContain("createLifeSimulation");
    expect(generated).toContain('mount("#apartment", { avatar: { name: "TestBot" } }, life)');
    expect(await readFile(join(tmpDir, ".env.example"), "utf8")).toContain("OPENAI_API_KEY=");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("sets hosted mode when specified", async () => {
    const result = await runInit({
      yes: true,
      mode: "hosted",
      gatewayUrl: "https://gateway.example.com",
      tenantApiKey: "ag_testkey",
      siteOrigin: "https://example.com",
      avatarName: "HostedBot",
      installPackages: false,
      connectGateway: false,
    }, tmpDir);
    expect(result.mode).toBe("hosted");
    expect(result.gatewayUrl).toBe("https://gateway.example.com");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("does not overwrite existing scaffold files", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ dependencies: {} }));
    // First init
    await runInit({ yes: true, avatarName: "Bot1", installPackages: false, connectGateway: false }, tmpDir);
    // Second init should not throw (flag: "wx" skips existing files)
    await expect(runInit({ yes: true, avatarName: "Bot2", installPackages: false, connectGateway: false }, tmpDir)).resolves.not.toThrow();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("writes detected framework into result", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ dependencies: { next: "15.0.0", react: "19.0.0" } }));
    const result = await runInit({ yes: true, installPackages: false, connectGateway: false }, tmpDir);
    expect(result.framework).toBe("nextjs");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("installs packages and adds a gateway script when configured", async () => {
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "demo", scripts: { test: "vitest" } }));
    const install = vi.fn(async () => undefined);
    const result = await runInit({ yes: true, installPackages: true, connectGateway: false, installer: install }, tmpDir);
    expect(result.packagesInstalled).toBe(true);
    expect(install).toHaveBeenCalledWith(expect.arrayContaining(["@avatar-gateway/sdk", "@avatar-gateway/starter-apartment"]), tmpDir);
    const pkg = JSON.parse(await readFile(join(tmpDir, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["shubur:gateway"]).toBe("avatar-gateway-server");
  });

  it("creates a runnable package manifest for a new plain-HTML folder", async () => {
    const install = vi.fn(async () => undefined);
    await runInit({ yes: true, installPackages: true, connectGateway: false, installer: install }, tmpDir);
    const pkg = JSON.parse(await readFile(join(tmpDir, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.dev).toBe("vite --host 127.0.0.1");
    expect(pkg.scripts["shubur:gateway"]).toBe("avatar-gateway-server");
    expect(install).toHaveBeenCalledWith(expect.arrayContaining(["vite"]), tmpDir);
    expect(await readFile(join(tmpDir, "index.html"), "utf8")).toContain("@avatar-gateway/sdk");
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("formats next steps for non-interactive CLI output", () => {
    const text = formatInitSummary({
      framework: "plain-html", siteDid: "did:key:site", avatarDid: "did:key:avatar", avatarName: "TestBot",
      mode: "self_hosted", gatewayUrl: "http://localhost:4100", filesWritten: [], packagesInstalled: true, profilePublished: false,
    });
    expect(text).toContain("Shubur setup ready for TestBot");
    expect(text).toContain("saved locally as .avatar-gateway/profile.json");
    expect(text).toContain("npm run dev");
  });

  it("rejects insecure remote gateway URLs before writing keys", async () => {
    await expect(runInit({ yes: true, mode: "hosted", gatewayUrl: "http://gateway.example.test", tenantApiKey: "test", installPackages: false, connectGateway: false }, tmpDir)).rejects.toThrow("HTTPS");
    await expect(readFile(join(tmpDir, ".avatar-gateway/config.json"), "utf8")).rejects.toThrow();
  });

  it("requires a public HTTPS site origin in hosted mode", async () => {
    await expect(runInit({
      yes: true, mode: "hosted", gatewayUrl: "https://gateway.example.com", tenantApiKey: "ag_key",
      installPackages: false, connectGateway: false,
    }, tmpDir)).rejects.toThrow("DNS hostname");
    await expect(runInit({
      yes: true, mode: "hosted", gatewayUrl: "https://gateway.example.com", tenantApiKey: "ag_key",
      siteOrigin: "https://127.0.0.1", installPackages: false, connectGateway: false,
    }, tmpDir)).rejects.toThrow("DNS hostname");
    const result = await runInit({
      yes: true, mode: "hosted", gatewayUrl: "https://gateway.example.com", tenantApiKey: "ag_key",
      siteOrigin: "https://example.com", installPackages: false, connectGateway: false,
    }, tmpDir);
    expect(result.mode).toBe("hosted");
    const config = JSON.parse(await readFile(join(tmpDir, ".avatar-gateway/config.json"), "utf8")) as { siteOrigin: string };
    expect(config.siteOrigin).toBe("https://example.com");
  });
});
