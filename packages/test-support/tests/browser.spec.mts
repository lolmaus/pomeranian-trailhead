import { expect, test } from "@playwright/test";

test("inline HTML click changes an observable counter", async ({ page }) => {
  await page.setContent(`
    <button data-clicks="0" onclick="this.dataset.clicks++">Click me</button>
  `);
  const button = page.getByRole("button", { name: "Click me" });
  await button.click();
  await expect(button).toHaveAttribute("data-clicks", "1");
});
