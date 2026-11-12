import { test, expect } from "@playwright/test";
// #region standalone
import { chromium } from "playwright";
import { DomPageObject } from "@pomeranian/core/dom-page-object";

async function standaloneExample() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent("<button>Continue</button>");
      const button = DomPageObject.create(page, ({ page }) => page.getByRole("button"));
      return await button.locator.textContent();
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
// #endregion standalone

test("standalone native-only usage owns and cleans up its browser lifecycle", async () => {
  expect(await standaloneExample()).toBe("Continue");
});
