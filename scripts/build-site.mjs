// Builds the static landing page assets in site/assets from the workspace packages.
// GitHub Pages publishes site/ as-is, so the outputs are committed; rerun after
// changing site/src or the starter-apartment / life packages (npm run build does).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "rolldown";
import { buildSceneSvg, resolveConfig } from "@avatar-gateway/starter-apartment";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "site", "assets");
await mkdir(assets, { recursive: true });

await build({
  input: join(root, "site", "src", "living-home.js"),
  platform: "browser",
  logLevel: "warn",
  output: { file: join(assets, "living-home.js"), format: "esm", minify: true },
});

// Poster shown before the live scene loads, and kept for no-JS or Save-Data visitors.
const poster = buildSceneSvg(
  resolveConfig({ avatar: { name: "Your agent", accessories: ["headphones"] }, dayCycle: { timezone: "UTC" } }),
  new Date("2026-01-01T10:00:00Z"),
  "studio",
  { startHour: 9, endHour: 13, activity: "working", caption: "Working on a personal project", room: "studio" },
);
await writeFile(join(assets, "apartment-poster.svg"), `${poster.svg.replace(/\n\s*/g, "")}\n`);
