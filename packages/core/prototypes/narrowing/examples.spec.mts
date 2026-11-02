// THROWAWAY #11: typed reconstruction evidence, not production core.
import { test, expect } from "@playwright/test";
import { DomPageObject, PageObject, rootFixture, type LocatorFactory } from "./probe.mts";

test("first reconstructs the concrete class and reinitializes its custom fields", async ({
  page,
}) => {
  await page.setContent('<div class="row">A</div><div class="row">B</div>');
  class Row extends DomPageObject<null> {
    override readonly defaultTarget = ".row";
    label = "Initial";
    #count = 0;
    increment(): number {
      return ++this.#count;
    }
    custom(): string {
      return "Row API";
    }
  }
  const source = Row.create(page);
  source.label = "Changed";
  expect(source.increment()).toBe(1);
  expect(source.increment()).toBe(2);
  const derived = source.first();
  expect(derived).not.toBe(source);
  expect(derived).toBeInstanceOf(Row);
  expect(derived.custom()).toBe("Row API");
  expect(derived.label).toBe("Initial");
  expect(derived.increment()).toBe(1);
  expect(source.increment()).toBe(3);
  await expect(derived.locator).toHaveText("A");
  await expect(source.locator).toHaveCount(2);
});

test("filter captures its arguments when called while Locator resolution remains lazy", async ({
  page,
}) => {
  await page.setContent("<p>Sale</p><p>Other</p>");
  let calls = 0;
  const source = DomPageObject.create(page, () => {
    calls++;
    return page.locator("p");
  });
  const text = /Sale/i;
  const options = { hasText: text };
  const derived = source.filter(options);
  options.hasText = /Other/i;
  // RegExp has mutable internal slots too; caller mutation must not rewrite a chosen argument.
  text.compile("Other", "i");
  expect(calls).toBe(0);
  await expect(derived.locator).toHaveText("Sale");
  expect(calls).toBe(1);
  expect(derived.locator).toBe(derived.locator);
  await expect(source.locator).toHaveCount(2);
});

test("fresh nested children follow narrowed scope through groups without rebasing explicit targets", async ({
  page,
}) => {
  await page.setContent(
    '<main id="app"><section class="row"><button>A1</button><button>A2</button></section><section class="row"><button>B1</button><button>B2</button></section></main><button id="global">Global</button>',
  );
  const supplied = page.locator("#global");
  class BaseRow extends DomPageObject<App> {
    Group = Group.create(this);
    override readonly defaultTarget: string = "#unused-base-default";
    inherited(): string {
      return "Base API";
    }
  }
  class Row extends BaseRow {
    override readonly defaultTarget = ".row";
    byText(text: string): this {
      return this.filter({ hasText: text });
    }
  }
  class Group extends PageObject<App> {
    Button = DomPageObject.create(this, "button");
    Scoped = DomPageObject.create(this, ({ page: received, scope }) =>
      (scope ?? received).getByRole("button"),
    );
    Supplied = DomPageObject.create(this, supplied);
    Global = DomPageObject.create(this, ({ page: received }) => received.locator("#global"));
  }
  class App extends DomPageObject<App> {
    Row = Row.create(this);
    override readonly defaultTarget = "#app";
  }
  await rootFixture(App)({ page }, async (app) => {
    const source = app.Row;
    const sourceButtonLocator = source.Group.Button.locator;
    const second = source.nth(1);
    expect(second.inherited()).toBe("Base API");
    expect(second.root).toBe(app);
    expect(second.Group.root).toBe(app);
    expect(second.Group.Button.root).toBe(app);
    expect(second.Group).not.toBe(source.Group);
    expect(second.Group.Button).not.toBe(source.Group.Button);
    expect(second.Group.Button.locator).not.toBe(sourceButtonLocator);
    await expect(second.Group.Button.locator).toHaveText(["B1", "B2"]);
    await expect(second.Group.Scoped.locator).toHaveText(["B1", "B2"]);
    await expect(second.Group.Button.last().locator).toHaveText("B2");
    await expect(second.Group.Supplied.locator).toHaveText("Global");
    expect(second.Group.Supplied.locator).toBe(supplied);
    await expect(second.Group.Global.locator).toHaveText("Global");
    await expect(source.Group.Button.locator).toHaveCount(4);
    await expect(second.byText("A").locator).toHaveCount(0);
    const again = source.nth(1);
    expect(again).not.toBe(second);
    expect(again.Group.Button).not.toBe(second.Group.Button);
  });
});

test("position and filter operations compose in order over the existing matches", async ({
  page,
}) => {
  await page.setContent("<p>A</p><p>Sale B</p><p>Sale C</p><p hidden>Sale D</p>");
  const source = DomPageObject.create(page, "p");
  await expect(source.last().locator).toHaveText("Sale D");
  await expect(source.nth(1).locator).toHaveText("Sale B");
  const sales = source.filter({ hasText: "Sale", visible: true });
  await expect(sales.locator).toHaveText(["Sale B", "Sale C"]);
  await expect(sales.first().locator).toHaveText("Sale B");
  await expect(source.first().filter({ hasText: "Sale" }).locator).toHaveCount(0);
  expect(source.filter()).not.toBe(source);
  await expect(source.locator).toHaveCount(4);
});
