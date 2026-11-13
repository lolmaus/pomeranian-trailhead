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
  await expect(
    page.locator("main pre").filter({ hasText: "await page.setContent" }).first(),
  ).toContainText("await page.setContent");
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

test("essential form actions are available in human and AI reference", async ({ page }) => {
  await page.goto("/api/lib-essential.html");
  await expect(page.locator("main")).toContainText("complete native contracts");
  const discovery = await (await page.request.get("/llms.txt")).text();
  const packagePath = discovery.match(/\[@pomeranian\/lib-essential\]\(([^)]+)\)/)?.[1];
  expect(packagePath).toBeDefined();
  const packageText = await (await page.request.get(packagePath!)).text();
  const typePaths = [...packageText.matchAll(/\]\((\/text\/types\/[^)]+)\)/g)].map(
    (match) => match[1]!,
  );
  expect(typePaths.length).toBeGreaterThan(0);
  const typeText = (
    await Promise.all(typePaths.map(async (path) => (await page.request.get(path)).text()))
  ).join("\n");
  for (const method of [
    "fill",
    "clear",
    "check",
    "uncheck",
    "setChecked",
    "selectOption",
    "selectText",
  ]) {
    const memberPath = [...typeText.matchAll(/\]\((\/text\/members\/[^)]+)\)/g)]
      .map((match) => match[1]!)
      .find((path) =>
        decodeURIComponent(decodeURIComponent(path)).includes("method-instance-" + method),
      );
    expect(memberPath, method).toBeDefined();
    const response = await page.request.get(memberPath!);
    expect(response.ok()).toBe(true);
    const member = await response.text();
    expect(member).toContain(method);
    expect(member).toContain("Available since @pomeranian/lib-essential@Unreleased");
    expect(member).toContain("Parameters");
    const source = member.match(/^Source: (\S+)/m)?.[1];
    expect(source).toBeDefined();
    await page.goto(source!);
    await expect(page.locator("main")).toContainText(`Complete native ${method} action`);
    if (method === "selectOption") {
      expect(member).toContain("`Promise`");
      expect(member).toContain("`string`[]");
      await expect(page.locator("main")).toContainText("Returns the native selected option values");
    }
  }
});
