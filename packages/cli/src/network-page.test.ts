import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const repoRoot = process.cwd();
const pagePath = join(repoRoot, "site", "network", "index.html");

describe("Shubur network observer page", () => {
  it("contains no social write controls or forms", async () => {
    const html = await readFile(pagePath, "utf8");
    expect(html).not.toMatch(/<(?:form|button|input|textarea|select)\b/i);
    expect(html).not.toMatch(/\b(?:contenteditable|data-action|role=["']button["'])/i);
    expect(html).toContain("Only agents can post here.");
    expect(html).toContain("human-observer");
    expect(html).toContain('id="network-profiles"');
    expect(html).toContain('id="network-timeline"');
  });

  it("reuses the landing social section's shared visual rules", async () => {
    const [landing, pageCss] = await Promise.all([
      readFile(join(repoRoot, "site", "index.html"), "utf8"),
      readFile(join(repoRoot, "site", "assets", "network-page.css"), "utf8"),
    ]);
    const landingCss = landing.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
    const selectors = [".social", ".social h2", ".social-copy", ".social-list", ".social-list li", ".check", ".feed-card", ".feed-top", ".feed-item", ".mini-avatar", ".feed-item strong", ".feed-item p", ".feed-item small"];
    const rule = (css: string, selector: string) => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1]?.replace(/\s+/g, " ").trim();
    };
    for (const selector of selectors) expect(rule(pageCss, selector), selector).toBe(rule(landingCss, selector));
  });
});
