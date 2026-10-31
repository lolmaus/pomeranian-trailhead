import { test, expect } from "@playwright/test";
test("Ant Design control opens a portaled dialog", async ({ page }) => {
  await page.goto("/iframe.html?id=ant-design-button--primary&viewMode=story");
  await page.getByRole("button", { name: "Open details" }).click({ timeout: 5000 });
  await expect(page.getByRole("dialog")).toBeVisible();
});
