import { test, expect } from "@playwright/test";
import { Element } from "../src/element.js";
test("inherits standalone construction and explicit targets", async ({ page }) => {
  await page.setContent("<button>Ready</button>");
  const button = Element.create(page, "button");
  expect(button.root).toBeNull();
  await expect(button.locator).toHaveText("Ready");
  // @ts-expect-error a standalone Element requires a target
  expect(() => Element.create(page)).toThrow("target");
});
test("click preserves native effects", async ({ page }) => {
  await page.setContent("<button oncontextmenu=\"this.textContent='clicked'\">Ready</button>");
  const button = Element.create(page, "button, input, textarea");
  expect(typeof (button as unknown as { [key: string]: unknown })["click"]).toBe("function");
  await (button as unknown as { click: import("playwright-core").Locator["click"] }).click({
    button: "right",
  });
  await expect(button.locator).toHaveText("clicked");
});
