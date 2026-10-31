import { test, expect } from "@playwright/test";

test("built development site navigates to honest package status and generated reference", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^Pomeranian/, level: 1 })).toBeVisible();
  await expect(page.locator("main")).toContainText("no published Pomeranian consumer package");
  await page.getByRole("link", { name: "API reference", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: /^Package API reference/, level: 1 }),
  ).toBeVisible();
  await page.goto("/reference/development/config/variables/testConfig.html");
  await expect(page.locator("main")).toContainText("Available since @repo/test-support@Unreleased");
  await expect(page.locator("main")).toContainText("private workspace API");
  await page.goto("/reference/development/stories/functions/typedStories.html");
  await expect(page.locator("main")).toContainText("Literal metadata checks identity");
  await page.goto("/reference/development/story-server/functions/storyServer.html");
  await expect(page.locator("main")).toContainText("CI/fresh runs cannot reuse a busy server");
  await page.goto("/getting-started.html");
  await expect(page.locator("main pre").filter({ hasText: "await page.setContent" })).toContainText(
    "await page.setContent",
  );
  await page.goto("/guides/factory-proof.html#accepted-typedoc-limitation");
  await expect(page.locator("main")).toContainText("accepted, unfixed limitation");
  expect(errors).toEqual([]);
});
