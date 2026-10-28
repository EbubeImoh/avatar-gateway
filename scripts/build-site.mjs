// Builds the static landing page assets in site/assets from the workspace packages.
// GitHub Pages publishes site/ as-is, so the outputs are committed; rerun after
// changing site/src or the starter-apartment / life packages (npm run build does).

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "rolldown";
import { resolveConfig } from "@avatar-gateway/starter-apartment";
import { createLifeSimulation } from "@shubur/life";
import { SAMPLE_HOMES, SAMPLE_SEED } from "../site/src/sample-homes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "site", "assets");
await mkdir(assets, { recursive: true });

await build({
  input: join(root, "site", "src", "portfolio-world", "living-home.js"),
  platform: "browser",
  logLevel: "warn",
  output: { file: join(assets, "portfolio-world.js"), format: "esm", minify: false },
});
await copyFile(
  join(root, "site", "src", "portfolio-world", "house.css"),
  join(assets, "portfolio-world.css"),
);

// Day-in-the-life comparison: the same seeded agent living one generated day in each sample home.
// Written between markers in index.html so it renders without JavaScript.
const DAY = new Date("2026-01-01T00:00:00Z");
const HOUR_MS = 60 * 60 * 1000;
const escapeHtml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clockTime = (hour) => `${String(hour).padStart(2, "0")}:00`;

function generatedDay(home) {
  const resolved = resolveConfig(home.config);
  const roomName = new Map(resolved.layout.rooms.map((room) => [room.id, room.name]));
  // Live the previous day first so the shown day starts mid-life rather than at move-in.
  const life = createLifeSimulation({ agentId: "shubur-site-sample", seed: SAMPLE_SEED, apartment: home.config, startedAt: new Date(DAY.getTime() - 24 * HOUR_MS), timeZone: "UTC" });
  const items = life.getDayActivities(new Date(DAY.getTime() + 30 * 60 * 1000)).map((slot) =>
    `                <li><span>${clockTime(slot.startHour)}–${clockTime(slot.endHour)}</span><span>${escapeHtml(slot.caption)} · ${escapeHtml(roomName.get(slot.room) ?? slot.room)}</span></li>`);
  const rooms = resolved.layout.rooms.map((room) => room.name).join(", ");
  return [
    `            <article class="life-card life-day" data-home="${home.id}">`,
    `              <span class="life-time">${escapeHtml(home.label)}</span>`,
    `              <h3>${escapeHtml(resolved.name)}</h3>`,
    `              <p>${escapeHtml(rooms)}</p>`,
    `              <ol class="life-routine">`,
    ...items,
    `              </ol>`,
    `            </article>`,
  ].join("\n");
}

const START = "<!-- life-days:start -->";
const END = "<!-- life-days:end -->";
const indexPath = join(root, "site", "index.html");
const html = await readFile(indexPath, "utf8");
const from = html.indexOf(START);
const to = html.indexOf(END);
if (from < 0 || to < from) throw new Error("site/index.html is missing the life-days markers.");
const days = SAMPLE_HOMES.map(generatedDay).join("\n");
const next = `${html.slice(0, from + START.length)}\n${days}\n            ${html.slice(to)}`;
if (next !== html) await writeFile(indexPath, next);
