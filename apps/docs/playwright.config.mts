import { defineConfig } from "@playwright/test";
import { testConfig } from "@repo/test-support/config";

export default defineConfig(testConfig, {
  testDir: ".",
  testMatch: ["tests/**/*.spec.mts", "examples/*.spec.mts"],
  testIgnore: ["**/node_modules/**", "**/.generated/**"],
  workers: 2,
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "node lib/cli.mts preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
