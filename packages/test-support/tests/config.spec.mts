import { expect, test } from "@playwright/test";
import { testConfig } from "../src/config.mts";

test("shared defaults select Chromium without requiring a story server", () => {
  expect(testConfig.projects).toEqual([{ name: "chromium", use: { browserName: "chromium" } }]);
  expect(testConfig.webServer).toBeUndefined();
});
