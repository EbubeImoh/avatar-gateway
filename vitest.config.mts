import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@avatar-gateway/starter-apartment": resolve(process.cwd(), "packages/starter-apartment/dist/index.js"),
      "@shubur/life": resolve(process.cwd(), "packages/life/dist/index.js"),
    },
  },
  test: {
    include: ["packages/**/src/**/*.test.ts", "site/src/**/*.test.js"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
