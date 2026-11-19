import { test, expect } from "@playwright/test";
import { DomPageObject } from "../src/dom-page-object.js";

test("first reconstructs a fresh concrete object and leaves the source live", async ({ page }) => {
  class Row extends DomPageObject {
    Child = DomPageObject.create(this, "button");
  }
  const source = Row.create(page, "section");
  const first = source.first();
  expect(first).toBeInstanceOf(Row);
  expect(first).not.toBe(source);
  expect(first.Child).not.toBe(source.Child);
  await page.setContent(
    "<section><button>A</button></section><section><button>B</button></section>",
  );
  await expect(first.Child.locator).toHaveText("A");
  await expect(source.Child.locator).toHaveText(["A", "B"]);
});

test("positional chains preserve call order and native empty/negative semantics", async ({
  page,
}) => {
  const source = DomPageObject.create(page, "button");
  const last = source.last();
  const negative = source.nth(-1);
  await page.setContent("<button>A</button><button>B</button>");
  await expect(last.locator).toHaveText("B");
  await expect(negative.locator).toHaveText("B");
  await expect(source.nth(8).locator).toHaveCount(0);
});

test("filter captures inherited criteria and regex before resolving", async ({ page }) => {
  let reads = 0;
  let calls = 0;
  const regex = /Alpha/i;
  const options = Object.create({
    get hasText() {
      reads++;
      return regex;
    },
  });
  const source = DomPageObject.create(page, () => {
    calls++;
    return page.locator("section");
  });
  const filtered = (source as DomPageObject & { filter(options?: object): DomPageObject }).filter(
    options,
  );
  expect(reads).toBe(1);
  expect(calls).toBe(0);
  regex.compile("Beta");
  await page.setContent("<section>Alpha</section><section>Beta</section>");
  await expect(filtered.locator).toHaveText("Alpha");
  expect(calls).toBe(1);
});

test("native filter combinations and call order", async ({ page }) => {
  await page.setContent(
    "<section><b>A</b></section><section hidden>B</section><section><b>C</b></section>",
  );
  const rows = DomPageObject.create(page, "section");
  await expect(
    rows.filter({ has: page.locator("b"), hasNotText: "A", visible: true }).locator,
  ).toHaveText("C");
  await expect(rows.filter({ hasNot: page.locator("b") }).locator).toHaveText("B");
  await expect(rows.first().filter({ hasText: "C" }).locator).toHaveCount(0);
  await expect(rows.filter({ hasText: "C" }).first().locator).toHaveText("C");
  await expect(rows.filter().locator).toHaveCount(3);
});

test("public reconstruction replays state and guards initialization without resolving", async ({
  page,
}) => {
  class Row extends DomPageObject {
    #count = 0;
    Child = DomPageObject.create(this, "button");
    Selected = this.Child.first();
    increment() {
      return ++this.#count;
    }
  }
  const source = Row.create(page, "section");
  source.increment();
  Object.defineProperty(source, "constructor", { value: DomPageObject });
  const derived = source.nth(1);
  expect(derived.increment()).toBe(1);
  await page.setContent(
    "<section><button>A</button></section><section><button>B</button></section>",
  );
  await expect(derived.Selected.locator).toHaveText("B");
  class Invalid extends DomPageObject {
    Invalid = this.first();
  }
  expect(() => Invalid.create(page, "section")).toThrow("initialization");
});

import { rootFixture } from "../src/root-fixture.js";
import { PageObject } from "../src/page-object.js";
import { derivations } from "../src/internal/reconstruction.js";
import { state } from "../src/internal/state.js";
test("roots, grouped fresh children and ordered private lineage survive narrowing", async ({
  page,
}) => {
  class Group extends PageObject {
    Child = DomPageObject.create(this, "button");
  }
  class App extends DomPageObject<App> {
    Group = Group.create(this);
  }
  await page.setContent(
    "<section><button>A</button></section><section><button>B</button></section>",
  );
  await rootFixture(App, "section")({ page }, async (source) => {
    const filtered = source.filter({ hasText: /B/ });
    const selected = filtered.first();
    expect(selected.root).toBe(selected);
    expect(selected.Group.root).toBe(selected);
    expect(state(selected.Group).parent).toBe(selected);
    expect(derivations.get(selected)?.source).toBe(filtered);
    expect(derivations.get(filtered)?.source).toBe(source);
    expect(Object.isFrozen(derivations.get(filtered)?.operation.arguments?.[0])).toBe(true);
    await expect(selected.Group.Child.locator).toHaveText("B");
    await expect(source.Group.Child.locator).toHaveText(["A", "B"]);
  });
});
test("derived resolution retries source failure and retains explicit global children", async ({
  page,
}) => {
  let fail = true,
    calls = 0;
  class Row extends DomPageObject {
    Global = DomPageObject.create(this, ({ page }) => page.locator("aside"));
    Explicit = DomPageObject.create(this, this.page.locator("aside"));
  }
  const source = Row.create(page, () => {
    calls++;
    if (fail) throw Error("retry");
    return page.locator("section");
  });
  const selected = source.first();
  expect(() => selected.locator).toThrow("retry");
  fail = false;
  await page.setContent("<section>A</section><aside>Global</aside>");
  await expect(selected.locator).toHaveText("A");
  expect(selected.locator).toBe(selected.locator);
  expect(calls).toBe(2);
  await expect(selected.Global.locator).toHaveText("Global");
  await expect(selected.Explicit.locator).toHaveText("Global");
});
test("native containment refuses cross-frame Locators", async ({ page }) => {
  await page.setContent('<section>A</section><iframe srcdoc="<b>B</b>"></iframe>');
  const selected = DomPageObject.create(page, "section").filter({
    has: page.frameLocator("iframe").locator("b"),
  });
  await expect(selected.locator.count()).rejects.toThrow();
});
