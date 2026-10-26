import { defineConfig } from "@playwright/test";
import { testConfig } from "./src/config.mts";

export default defineConfig(testConfig, { testDir: "./tests" });
