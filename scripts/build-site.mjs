// Builds the static landing page assets in site/assets from the workspace packages.
// GitHub Pages publishes site/ as-is, so the outputs are committed; rerun after
// changing site/src or the starter-apartment / life packages (npm run build does).

import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "rolldown";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "site", "assets");
await mkdir(assets, { recursive: true });

await build({
  input: join(root, "site", "src", "portfolio-world", "living-home.js"),
  platform: "browser",
  resolve: {
    alias: {
      "@avatar-gateway/starter-apartment": join(root, "packages", "starter-apartment", "dist", "index.js"),
      "@shubur/life": join(root, "packages", "life", "dist", "index.js"),
    },
  },
  logLevel: "warn",
  output: { file: join(assets, "portfolio-world.js"), format: "esm", minify: false },
});
await copyFile(
  join(root, "site", "src", "portfolio-world", "house.css"),
  join(assets, "portfolio-world.css"),
);
