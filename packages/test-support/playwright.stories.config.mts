import { storyServer, storyURL } from "./src/story-server.mts";
const port = Number(process.env["STORYBOOK_SUPPORT_PORT"] ?? 6007);
import { defineConfig } from "@playwright/test";
import { testConfig } from "./src/config.mts";
export default defineConfig(testConfig, {
  webServer: storyServer(port),
  globalSetup: "./story-setup.mts",
  use: { baseURL: storyURL(port) },
  testDir: "./tests",
  outputDir: "test-results/stories",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/stories" }]],
  testMatch: "**/*.story.spec.mts",
});
