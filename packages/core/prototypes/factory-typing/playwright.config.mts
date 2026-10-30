import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: ["examples.spec.mts", "constructor-counterexamples.spec.mts"],
  workers: 1,
  outputDir: "./results",
  reporter: [["list"]],
  use: { browserName: "chromium", headless: true },
});
