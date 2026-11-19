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
        "<button id=continue onclick=\"this.textContent='Done'\">Continue</button><button id=decoy>Decoy</button>",
      );
      const button = Element.create(page, ({ page }) =>
        page.getByRole("button", { name: "Continue", exact: true }),
      );
      await button.click();
      return await page.locator("#continue").textContent();
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
// #endregion standalone

test("standalone native-only usage owns and cleans up its browser lifecycle", async () => {
  expect(await standaloneExample()).toBe("Done");
});
