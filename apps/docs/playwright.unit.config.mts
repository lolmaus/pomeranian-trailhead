import { defineConfig } from "@playwright/test";
import { testConfig } from "@repo/test-support/config";

export default defineConfig(testConfig, { testDir: "./tests", testIgnore: "site.spec.mts" });
