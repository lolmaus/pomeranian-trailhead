import { defineConfig } from "@playwright/test";
import { testConfig } from "./src/config.mts";

export default defineConfig(testConfig, {
  outputDir: "test-results/inline",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/inline" }]],
  testDir: "./tests",
  testIgnore: "**/*.story.spec.mts",
});
