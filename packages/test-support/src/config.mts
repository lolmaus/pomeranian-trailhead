import { defineConfig } from "@playwright/test";

/** Framework-independent Chromium defaults for repository contributors.
 * Each consumer owns its testDir and optional webServer. This private workspace
 * is development infrastructure, not a published Pomeranian consumer API.
 * @since @repo/test-support@Unreleased
 */
export const testConfig = defineConfig({
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  ...(process.env["CI"] ? { workers: 2 } : {}),
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
