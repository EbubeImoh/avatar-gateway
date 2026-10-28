import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.ts", "site/src/**/*.test.js"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
