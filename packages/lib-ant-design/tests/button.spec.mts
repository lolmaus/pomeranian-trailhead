import { test, expect } from "@playwright/test";
import { typedStories } from "@repo/test-support/stories";
import { storyURL } from "@repo/test-support/story-server";
const open = typedStories<typeof import("./button.stories.tsx")>("Ant Design/Button", {
  baseURL: storyURL(Number(process.env["STORYBOOK_ANTD_PORT"] ?? 6008)),
  ready: (p) => p.getByRole("button", { name: "Open details" }),
});
test("Ant Design control opens a portaled dialog", async ({ page }) => {
  await open(page, "Primary");
  await page.getByRole("button", { name: "Open details" }).click({ timeout: 5000 });
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("manual Ant Design catalog renders styled controls and portals", async ({ page }) => {
  await page.goto("/");
  const component = page.locator('[data-item-id="ant-design-button"] > button').first();
  await component.waitFor();
  if ((await component.getAttribute("aria-expanded")) !== "true") await component.click();
  await page.getByRole("link", { name: "Primary", exact: true }).click();
  const preview = page.frameLocator("#storybook-preview-iframe");
  const button = preview.getByRole("button", { name: "Open details" });
  await expect(button).toHaveCSS("background-color", "rgb(22, 119, 255)");
  await button.click();
  await expect(preview.getByRole("dialog")).toContainText("Portaled content");
});
