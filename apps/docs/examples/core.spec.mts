import { expect, test } from "@playwright/test";
// #region construction
import { DomPageObject, PageObject, rootFixture } from "@pomeranian/core";

class App extends DomPageObject<App> {
  override defaultTarget = "#app";
  Menu = Menu.create(this);
}
class Menu extends PageObject<App> {
  Approve = DomPageObject.create(this, "button");
}
const appTest = test.extend<{ app: App }>({ app: rootFixture(App) });

appTest("application objects share context and use live native queries", async ({ page, app }) => {
  await page.setContent('<main id="app"><button>Approve</button></main>');
  expect(app.root).toBe(app);
  expect(app.Menu.Approve.root).toBe(app);
  await expect(app.Menu.Approve.locator).toHaveText("Approve");
});
// #endregion construction

// #region authoring
import { checkLibrary, defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";

class ValueButton<
  Root extends UnboundRoot = UnboundRoot,
  Value = string,
> extends DomPageObject<Root> {
  declare readonly [defaultInstanceType]: {
    instance: ValueButton;
    parameters: { root: Root; value: Value };
  };
  override defaultTarget = "button";
  #value: Value | undefined = undefined;
  value(): Value | undefined {
    return this.#value;
  }
}
checkLibrary<ValueButton>()(ValueButton);
class AppButton extends ValueButton<App, number> {}
// #endregion authoring

appTest("a bound library subclass retains its independent parameter", async ({ app }) => {
  const button = AppButton.create(app);
  const value: number | undefined = button.value();
  expect(value).toBeUndefined();
  expect(button.root).toBe(app);
});

test("Pages have independent standalone trees", async ({ context, page }) => {
  // #region multiple-pages
  const secondPage = await context.newPage();
  try {
    await page.setContent("<h1>First tab</h1>");
    await secondPage.setContent("<h1>Second tab</h1>");
    const first = DomPageObject.create(page, "h1");
    const second = DomPageObject.create(secondPage, "h1");
    expect(first.root).toBeNull();
    expect(second.root).toBeNull();
    await expect(first.locator).toHaveText("First tab");
    await expect(second.locator).toHaveText("Second tab");
  } finally {
    await secondPage.close();
  }
  // #endregion multiple-pages
});

test("factories deliberately distinguish scoped content and portals", async ({ page }) => {
  // #region portals
  await page.setContent("<main><button>Open</button></main><dialog open>Global dialog</dialog>");
  const panel = DomPageObject.create(page, "main");
  const button = DomPageObject.create(panel, ({ page, scope }) =>
    (scope ?? page).getByRole("button"),
  );
  const dialog = DomPageObject.create(panel, ({ page }) => page.getByRole("dialog"));
  await expect(button.locator).toHaveText("Open");
  await expect(dialog.locator).toHaveText("Global dialog");
  // #endregion portals
});

test("same-Page frame Locators retain their native queries", async ({ page }) => {
  // #region frames
  await page.setContent('<iframe srcdoc="<button>Inside frame</button>"></iframe>');
  const input = page.frameLocator("iframe").getByRole("button");
  const button = DomPageObject.create(page, input);
  expect(button.locator).toBe(input);
  await expect(button.locator).toHaveText("Inside frame");
  // #endregion frames
});
