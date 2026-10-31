import { expect, test } from "@playwright/test";
// #region prototype
import { LibraryButton } from "../../../packages/core/prototypes/factory-typing/probe.mts";

test("the actual prototype library factory supports a neutral root", async ({ page }) => {
  await page.setContent('<button class="library">Approve</button><output>Waiting</output>');
  await page.getByRole("button").evaluate((button) => {
    button.addEventListener("click", () => {
      const output = document.querySelector("output");
      if (output) output.textContent = "Approved";
    });
  });
  const button = LibraryButton.create(page);
  expect(button.root).toBeNull();
  await button.click();
  await expect(page.locator("output")).toHaveText("Approved");
});
// #endregion prototype
