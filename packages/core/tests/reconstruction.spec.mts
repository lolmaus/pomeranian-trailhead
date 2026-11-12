import { test, expect } from "@playwright/test";
import { DomPageObject } from "../src/dom-page-object.js";
import { PageObject } from "../src/page-object.js";
import { reconstruct } from "../src/internal/reconstruction.js";
test("reconstruction creates fresh concrete state and child scope from a lazy replacement query", async ({
  page,
}) => {
  let fields = 0;
  class Group extends PageObject {
    Child = DomPageObject.create(this, "button");
  }
  class Row extends DomPageObject {
    Group = Group.create(this);
    #count = 0;
    field = ++fields;
    increment() {
      return ++this.#count;
    }
  }
  await page.setContent(
    "<section><button>A</button></section><section><button>B</button></section>",
  );
  const source = Row.create(page, "section");
  source.increment();
  const derived = reconstruct(source, (locator) => locator.nth(1));
  expect(derived).not.toBe(source);
  expect(derived).toBeInstanceOf(Row);
  expect(derived.increment()).toBe(1);
  expect(derived.field).toBe(2);
  expect(derived.Group).not.toBe(source.Group);
  await expect(derived.Group.Child.locator).toHaveText("B");
  await expect(source.Group.Child.locator).toHaveText(["A", "B"]);
});
import { rootFixture } from "../src/root-fixture.js";
import { state } from "../src/internal/state.js";
import { derivations } from "../src/internal/reconstruction.js";
test("reconstruction retains captured class and fixed source query without recapturing defaults", async ({
  page,
}) => {
  class Row extends DomPageObject {
    override defaultTarget = "section";
  }
  const source = Row.create(page);
  source.defaultTarget = "aside";
  Object.defineProperty(source, "constructor", { value: PageObject });
  const operation = { kind: "nth", arguments: [1] };
  const derived = reconstruct(source, (locator) => locator.nth(1), operation);
  operation.arguments[0] = 0;
  expect(derived).toBeInstanceOf(Row);
  expect(state(derived).parent).toBeNull();
  expect(derivations.get(derived)?.source).toBe(source);
  expect(derivations.get(derived)?.operation.arguments).toEqual([1]);
  await page.setContent("<section>A</section><section>B</section><aside>C</aside>");
  await expect(derived.locator).toHaveText("B");
});
test("completed children reconstruct inside an initializing ancestor without resolving it", async ({
  page,
}) => {
  class Parent extends DomPageObject {
    Child = DomPageObject.create(this, "button");
    Derived = reconstruct(this.Child, (locator) => locator.first());
    Guarded = (() => {
      try {
        void this.Derived.locator;
        return false;
      } catch {
        return true;
      }
    })();
  }
  const source = Parent.create(page, "section");
  expect(source.Guarded).toBe(true);
  await page.setContent("<section><button>A</button><button>B</button></section>");
  await expect(source.Derived.locator).toHaveText("A");
});
test("root reconstruction preserves designation with fresh root-aware children", async ({
  page,
}) => {
  class App extends DomPageObject<App> {
    Child = DomPageObject.create(this, "button");
  }
  await rootFixture(App, "section")({ page }, async (source) => {
    const derived = reconstruct(source, (locator) => locator.first());
    expect(derived.root).toBe(derived);
    expect(derived.Child.root).toBe(derived);
    expect(source.Child.root).toBe(source);
  });
});
test("self reconstruction during initialization fails before recursion", ({ page }) => {
  class Invalid extends DomPageObject {
    Rebuilt = reconstruct(this, (locator) => locator);
  }
  expect(() => Invalid.create(page, "section")).toThrow("initialization");
});
