import { defineConfig } from "@playwright/test";
import { testConfig } from "@repo/test-support/config";
export default defineConfig(testConfig, {
  testDir: "./tests",
  use: { baseURL: "http://127.0.0.1:6006" },
});
