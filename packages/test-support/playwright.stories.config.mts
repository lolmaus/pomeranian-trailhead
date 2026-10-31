import { defineConfig } from "@playwright/test";
import { testConfig } from "./src/config.mts";
export default defineConfig(testConfig, {
  testDir: "./tests",
  outputDir: "test-results/stories",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/stories" }]],
  testMatch: "**/*.story.spec.mts",
});
