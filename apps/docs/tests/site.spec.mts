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
  const discovery = await page.request.get("/llms.txt");
  expect(discovery.ok()).toBe(true);
  const discoveryText = await discovery.text();
  expect(discoveryText).toContain("/text/getting-started.txt");
  const packagePath = discoveryText.match(/\[@pomeranian\/core\]\(([^)]+)\)/)?.[1];
  expect(packagePath).toBeDefined();
  const packageResponse = await page.request.get(packagePath ?? "/missing-core-text");
  expect(packageResponse.ok()).toBe(true);
  const packageText = await packageResponse.text();
  const typePath = packageText.match(/\]\((\/text\/types\/[^)]+)\)/)?.[1];
  expect(typePath).toBeDefined();
  const typeResponse = await page.request.get(typePath ?? "/missing-type-text");
  expect(typeResponse.ok()).toBe(true);
  const memberPath = (await typeResponse.text()).match(/\]\((\/text\/members\/[^)]+)\)/)?.[1];
  expect(memberPath).toBeDefined();
  expect((await page.request.get(memberPath ?? "/missing-member-text")).ok()).toBe(true);
  const topic = await page.request.get("/text/getting-started.txt");
  expect(topic.ok()).toBe(true);
  expect(await topic.text()).toContain("await page.setContent");
  expect(errors).toEqual([]);
});
