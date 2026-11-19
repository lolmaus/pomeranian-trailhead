import { test, expect } from "@playwright/test";
// #region standalone
import { chromium } from "playwright";
import { Element } from "@pomeranian/lib-essential/element";

async function standaloneExample() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.setContent(
        "<button id=continue onclick=\"this.textContent='Done'\">Continue</button><button id=decoy onclick=\"this.textContent='Unexpected click'\">Decoy</button>",
      );
      const button = Element.create(page, ({ page }) =>
        page.getByRole("button", { name: "Continue", exact: true }),
      );
      await button.click();
      return {
        intended: await page.locator("#continue").textContent(),
        untouched: await page.locator("#decoy").textContent(),
      };
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
// #endregion standalone

test("standalone native-only usage owns and cleans up its browser lifecycle", async () => {
  expect(await standaloneExample()).toEqual({ intended: "Done", untouched: "Decoy" });
});
