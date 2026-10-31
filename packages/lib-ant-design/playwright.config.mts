import { defineConfig } from "@playwright/test";
import { testConfig } from "@repo/test-support/config";
import { storyServer, storyURL } from "@repo/test-support/story-server";
const port = Number(process.env["STORYBOOK_ANTD_PORT"] ?? 6008);
export default defineConfig(testConfig, {
  testDir: "./tests",
  webServer: storyServer(port),
  globalSetup: "./story-setup.mts",
  use: { baseURL: storyURL(port) },
});
