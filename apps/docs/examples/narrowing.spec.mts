import { test, expect } from "@playwright/test";
import { TextInput } from "@pomeranian/lib-essential";
// #region narrowing
test("narrowed controls retain their native editing actions", async ({ page }) => {
  await page.setContent('<input id="first"><input id="second">');
  const inputs = TextInput.create(page, "input");
  const second = inputs.nth(1);
  await second.fill("Ready");
  await expect(page.locator("#first")).toHaveValue("");
  await expect(page.locator("#second")).toHaveValue("Ready");
});
// #endregion narrowing
