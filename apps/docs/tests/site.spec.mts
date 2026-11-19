import { test, expect } from "@playwright/test";

test("extensionless links keep client navigation, direct loading and Markdown discovery", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Getting started", exact: true }).first();
  await expect(link).toHaveAttribute("href", "/getting-started");
  await page.evaluate(() => Reflect.set(window, "__pomeranianNavigation", true));
  await link.click();
  await expect(page).toHaveURL(/\/getting-started$/);
  await expect(page.getByRole("heading", { level: 1, name: /Getting started/i })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "__pomeranianNavigation"))).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Getting started/i })).toBeVisible();
  await expect(page.locator('head link[rel="alternate"][type="text/markdown"]')).toHaveAttribute(
    "href",
    "/getting-started.md",
  );
  const markdown = await request.get("/getting-started.md");
  expect(markdown.ok()).toBe(true);
  expect(await markdown.text()).toContain("# Getting started");
});

test("built development site navigates to honest package status and generated reference", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator('head link[rel="alternate"][type="text/markdown"]')).toHaveAttribute(
    "href",
    "/index.md",
  );
  await expect(page.locator('head link[rel="describedby"]')).toHaveAttribute("href", "/llms.txt");
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
  await page.goto("/reference/development/lib-essential/src/text-input/classes/TextInput.html");
  await page.locator("main a").filter({ hasText: "appendText" }).first().click();
  await expect(page.locator("main h1")).toContainText("appendText");
  await expect(page).not.toHaveURL(/\.html(?:#|$)/);
  await expect(page.locator('head link[rel="alternate"][type="text/markdown"]')).toHaveAttribute(
    "href",
    new URL(page.url()).pathname.replace(/\.html$/, "") + ".md",
  );
  expect(errors).toEqual([]);
});

test("discovery leads to shared Markdown, a single member, and all bundle levels", async ({
  request,
}) => {
  async function markdown(url: string) {
    const response = await request.get(url);
    expect(response.ok(), url).toBe(true);
    const body = await response.text();
    expect(body, url).not.toMatch(/<!doctype html|<html[ >]/i);
    expect(body, url).toMatch(/^#/m);
    return body;
  }
  const discovery = await markdown("/llms.txt");
  expect(discovery).not.toContain("/text/");
  const packagePath = discovery.match(
    /\[@pomeranian\/lib-essential[^\]]*\]\((\/indexes\/packages\/[^)]+)\)/,
  )?.[1];
  expect(packagePath).toBeDefined();
  const packageText = await markdown(packagePath!);
  const links = (value: string) => [...value.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]!);
  const textInputPath = links(packageText).find(
    (url) => /TextInput/i.test(decodeURIComponent(url)) && url.endsWith(".md"),
  );
  expect(textInputPath).toBeDefined();
  const typeText = await markdown(textInputPath!);
  const appendPath = links(typeText).find(
    (url) => /appendText/i.test(decodeURIComponent(url)) && url.split("#")[0] !== textInputPath,
  );
  expect(appendPath).toBeDefined();
  const member = await markdown(
    new URL(appendPath!, "http://127.0.0.1:4173" + textInputPath).pathname,
  );
  expect(member).toContain("appendText");
  expect(member).toContain("not atomic");
  expect(member).toContain("@pomeranian/lib-essential@Unreleased");
  expect(member).toContain("timeout");
  expect(member).toContain("Promise");
  expect(member).not.toContain("Complete native uncheck action");
  const guide = await markdown("/getting-started.md");
  expect(guide).toContain("await page.setContent");
  const full = await markdown("/llms-full.txt");
  expect(full).toContain("await page.setContent");
  expect(full).toContain("appendText");
  const bundleLinks = [...links(discovery), ...links(packageText)].filter((url) =>
    url.includes("/bundles/"),
  );
  expect(bundleLinks.length).toBeGreaterThan(0);
  for (const url of bundleLinks) await markdown(url);
});
