import { test, expect } from "@playwright/test";
import { DomPageObject } from "../src/dom-page-object.js";
test("explicit CSS targets resolve lazily to a live memoized query", async ({ page }) => {
  const object = DomPageObject.create(page, "button");
  const locator = object.locator;
  expect(object.locator).toBe(locator);
  await expect(locator).toHaveCount(0);
  await page.setContent("<button>Save</button>");
  await expect(locator).toHaveText("Save");
});
import { PageObject } from "../src/page-object.js";
test("completed subclass defaults scope inherited children through groups", async ({ page }) => {
  class Group extends PageObject {
    Child = DomPageObject.create(this, "button");
  }
  class Base extends DomPageObject {
    Group = Group.create(this);
  }
  class App extends Base {
    override readonly defaultTarget = "section";
  }
  await page.setContent("<button>Outside</button><section><button>Inside</button></section>");
  const object = App.create(page);
  await expect(object.Group.Child.locator).toHaveText("Inside");
});
test("Locator inputs retain identity and factories receive inherited scope", async ({ page }) => {
  await page.setContent("<button>Global</button><section><button>Scoped</button></section>");
  const parent = DomPageObject.create(page, "section");
  const supplied = page.locator("button").first();
  expect(DomPageObject.create(parent, supplied).locator).toBe(supplied);
  let calls = 0;
  const scoped = DomPageObject.create(parent, ({ scope, page: associated }) => {
    calls++;
    expect(associated).toBe(page);
    expect(scope).toBe(parent.locator);
    return (scope ?? associated).locator("button");
  });
  expect(calls).toBe(0);
  await expect(scoped.locator).toHaveText("Scoped");
  expect(scoped.locator).toBe(scoped.locator);
  expect(calls).toBe(1);
});
test("unsuccessful factory values and ownership errors stay retryable", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  let attempt = 0;
  const own = page.locator("button");
  const object = DomPageObject.create(
    page,
    () =>
      (++attempt === 1
        ? other.locator("button")
        : attempt === 2
          ? Promise.resolve(own)
          : own) as never,
  );
  expect(() => object.locator).toThrow("same Page");
  expect(() => object.locator).toThrow("synchronous");
  expect(object.locator).toBe(own);
  expect(attempt).toBe(3);
});
test("blocks child Locator access during ancestor initialization without poisoning it", async ({
  page,
}) => {
  class Parent extends DomPageObject {
    Child = DomPageObject.create(this, page.locator("button"));
    Seen = (() => {
      try {
        void this.Child.locator;
        return false;
      } catch {
        return true;
      }
    })();
  }
  const object = Parent.create(page, "section");
  expect(object.Seen).toBe(true);
  expect(object.Child.locator.page()).toBe(page);
});
test("cycles throw clearly and leave resolution retryable", ({ page }) => {
  let cycle = true;
  const object: DomPageObject = DomPageObject.create(page, () =>
    cycle ? object.locator : page.locator("button"),
  );
  expect(() => object.locator).toThrow("Cyclic target");
  cycle = false;
  expect(object.locator.page()).toBe(page);
});
import { rootFixture } from "../src/root-fixture.js";
test("only designated DOM roots use html fallback and invalid explicit targets never fall back", async ({
  page,
}) => {
  class App extends DomPageObject<App> {}
  await rootFixture(App)({ page }, async (app) => expect(app.locator).toBeTruthy());
  expect(() => DomPageObject.create(page, undefined as never)).toThrow("target is required");
  class Default extends DomPageObject {
    override defaultTarget = "button";
  }
  expect(() => Default.create(page, null as never)).toThrow("target must");
  // @ts-expect-error Deliberately bypass target restriction to verify runtime rejection.
  expect(() => PageObject.create(page, "button")).toThrow("do not accept targets");
});
test("string targets reject non-CSS engines and engine chains without rejecting quoted arrows", async ({
  page,
}) => {
  for (const target of ["text=Save", "xpath=//button", "button >> text=Save", "", "//button"])
    expect(() => DomPageObject.create(page, target)).toThrow();
  await page.setContent('<button data-value="a >> b">Save</button>');
  await expect(DomPageObject.create(page, 'css=button[data-value="a >> b"]').locator).toHaveText(
    "Save",
  );
});
