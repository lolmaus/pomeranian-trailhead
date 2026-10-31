import { test, expect } from "@playwright/test";

test("built development site navigates to honest package status and generated reference", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pomeranian", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("no published Pomeranian consumer package");
  await page.getByRole("link", { name: "API reference", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Package API reference", exact: true }),
  ).toBeVisible();
  await page.goto("/reference/development/variables/testConfig.html");
  await expect(page.locator("main")).toContainText("Available since @repo/test-support@Unreleased");
  await expect(page.locator("main")).toContainText("private workspace API");
  await page.goto("/getting-started.html");
  await expect(page.locator("main pre")).toContainText("await page.setContent");
  await page.goto("/guides/factory-proof.html#accepted-typedoc-limitation");
  await expect(page.locator("main")).toContainText("accepted, unfixed limitation");
  expect(errors).toEqual([]);
});
