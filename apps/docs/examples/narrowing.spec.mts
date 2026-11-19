import { test, expect } from "@playwright/test";
import { TextInput } from "@pomeranian/lib-essential";
// #region narrowing
test("narrowed controls retain their native editing actions", async ({ page }) => {
  await page.setContent("<input><input>");
  const inputs = TextInput.create(page, "input");
  const second = inputs.nth(1);
  await second.fill("Ready");
  await expect(inputs.first().locator).toHaveValue("");
  await expect(second.locator).toHaveValue("Ready");
});
// #endregion narrowing
