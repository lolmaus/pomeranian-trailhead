import { test as base, expect } from "@playwright/test";
import {
  rootFixture,
  Element,
  App,
  Toolbar,
  CompactToolbar,
  LibraryButton,
  AppButton,
  FlexibleButton,
} from "./probe.mts";
import { Styled, Counter, HtmlApp, GroupApp, AppValueButton } from "./contracts.mts";

const test = base.extend<{ app: App; overridden: App }>({
  app: rootFixture(App),
  overridden: rootFixture(App, "#alternative"),
});
const html = `<main id="app"><nav class="menu"><b class="item">app item</b><button class="library" onclick="this.dataset.clicked='yes'">App action</button></nav><div class="confirmation"><button data-testid="confirm" onclick="document.querySelector('#app').dataset.confirmed='yes'">Confirm</button></div></main>
<aside id="alternative"><nav class="menu"><b class="item">alternative item</b></nav></aside>
<section class="toolbar"><b class="item">toolbar item</b></section>
<section class="compact"><b class="item">compact item</b></section><button id="standalone-button">Standalone action</button>`;

test("late defaults scope children through a targetless group", async ({ page, app }) => {
  await page.setContent(html);
  await expect(app.locator).toHaveAttribute("id", "app");
  await expect(app.Settings.Menu.Item.locator).toHaveText("app item");
  expect(app.Settings.Menu.root).toBe(app);
});

test("explicit root target overrides its instance default for all children", async ({
  page,
  overridden,
}) => {
  await page.setContent(html);
  await expect(overridden.locator).toHaveAttribute("id", "alternative");
  await expect(overridden.Settings.Menu.Item.locator).toHaveText("alternative item");
});

base("standalone defaults can follow child fields", async ({ page }) => {
  await page.setContent(html);
  const toolbar = Toolbar.create(page);
  expect(toolbar.root).toBeNull();
  expect(toolbar.Item.root).toBeNull();
  await expect(toolbar.Item.locator).toHaveText("toolbar item");
});

base("a subclass default also scopes inherited children", async ({ page }) => {
  await page.setContent(html);
  const compact = CompactToolbar.create(page);
  await expect(compact.Item.locator).toHaveText("compact item");
});

test("direct library use preserves its API and app scope without an app root dependency", async ({
  page,
  app,
}) => {
  await page.setContent(html);
  const button = app.Settings.Menu.LibraryButton;
  expect(button.libraryOnly()).toBe("library API");
  expect(button.root).toBe(app);
  await expect(button.locator).toHaveText("App action");
  await button.click();
  await expect(button.locator).toHaveAttribute("data-clicked", "yes");
});

test("app-bound subclass can coordinate a global confirmation", async ({ page, app }) => {
  await page.setContent(html);
  const button = app.Settings.Menu.Approval;
  const typedButton: AppButton = button;
  expect(typedButton.getRoot()).toBe(app);
  await typedButton.approve();
  await expect(app.locator).toHaveAttribute("data-confirmed", "yes");
});

base("raw library object also supports rootless standalone use", async ({ page }) => {
  await page.setContent(html);
  const button = LibraryButton.create(page, "#standalone-button");
  expect(button.getRoot()).toBeNull();
  expect(button.libraryOnly()).toBe("library API");
  await expect(button.locator).toHaveText("Standalone action");
});

test("nullable-root app class deliberately handles both modes", async ({ page, app }) => {
  await page.setContent(html);
  const rootless = FlexibleButton.create(page, "#standalone-button");
  expect(rootless.root).toBeNull();
  await rootless.approveIfRooted();
  await expect(app.locator).not.toHaveAttribute("data-confirmed", "yes");
  const rooted = FlexibleButton.create(app.Settings.Menu);
  expect(rooted.getRoot()).toBe(app);
  await rooted.approveIfRooted();
  await expect(app.locator).toHaveAttribute("data-confirmed", "yes");
});

base("fixture html fallback and grouping root preserve early self-reference", async ({ page }) => {
  await page.setContent('<button class="library">Action</button>');
  await rootFixture(HtmlApp)({ page }, async (app) => {
    expect(app.root).toBe(app);
    expect(app.Child.root).toBe(app);
    await expect(app.locator).toHaveCount(1);
    await expect(app.Child.locator).toHaveText("Action");
  });
  await rootFixture(GroupApp)({ page }, async (app) => {
    expect(app.root).toBe(app);
    expect(app.Child.root).toBe(app);
    await expect(app.Child.locator).toHaveText("Action");
  });
});

base(
  "equivalent generic subclasses keep actual constructor identity and overrides",
  async ({ page }) => {
    await page.setContent('<button class="styled">Styled</button>');
    const styled = Styled.create(page);
    expect(styled).toBeInstanceOf(Styled);
    expect(styled.constructor).toBe(Styled);
    await expect(styled.locator).toHaveText("Styled");
  },
);

test("protected constructors initialize independent private state", async ({ page, app }) => {
  await page.setContent(html);
  const first = Counter.create(app);
  const second = Counter.create(app);
  expect(first.increment()).toBe(1);
  expect(first.increment()).toBe(2);
  expect(second.increment()).toBe(1);
  const value = AppValueButton.create(app);
  expect(value).toBeInstanceOf(AppValueButton);
  expect(value.root).toBe(app);
  expect(value.value()).toBeUndefined();
});

base("ordinary DOM construction still validates an absent target at runtime", async ({ page }) => {
  // The call is deliberately rejected statically too; execute it only to check
  // the library's runtime boundary for JavaScript/otherwise unchecked callers.
  // @ts-expect-error Element without an instance default needs an explicit target.
  expect(() => Element.create(page)).toThrow("A DOM target is required.");
  expect(() => LibraryButton.create(page, "")).toThrow("A DOM target is required.");
});
