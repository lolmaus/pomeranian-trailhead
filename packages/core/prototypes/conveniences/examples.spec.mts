// THROWAWAY #19: typed reconstruction evidence, not production core.
import { test, expect } from "@playwright/test";
import {
  DomPageObject,
  PageObject,
  rootFixture,
  inspectOccurrenceForProof,
  type LocatorFactory,
} from "./probe.mts";

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

test("captures inherited filter option getters once instead of dropping their criteria", async ({
  page,
}) => {
  await page.setContent(
    "<article>Sale <b>A</b></article><article>Other <i>B</i></article><article hidden>Sale <b>Archived</b></article>",
  );
  const reads = new Map<string, number>();
  const read = <Value,>(key: string, value: Value): Value => {
    reads.set(key, (reads.get(key) ?? 0) + 1);
    return value;
  };
  class Criteria {
    get has() {
      return read("has", page.locator("b"));
    }
    get hasNot() {
      return read("hasNot", page.locator("i"));
    }
    get hasText() {
      return read("hasText", /Sale/i);
    }
    get hasNotText() {
      return read("hasNotText", "Archived");
    }
    get visible() {
      return read("visible", true);
    }
  }
  const options = new Criteria();
  const derived = DomPageObject.create(page, "article").filter(options);
  const operation = inspectOccurrenceForProof(derived).derivation?.operation;
  expect(operation?.kind).toBe("filter");
  if (operation?.kind !== "filter") throw new Error("Expected filter description");
  expect(operation.options?.hasText).toEqual({ source: "Sale", flags: "i" });
  expect(operation.options?.hasNotText).toBe("Archived");
  expect(operation.options?.visible).toBe(true);
  expect([...reads.entries()].sort()).toEqual([
    ["has", 1],
    ["hasNot", 1],
    ["hasNotText", 1],
    ["hasText", 1],
    ["visible", 1],
  ]);
  await expect(derived.locator).toHaveText("Sale A");
  expect([...reads.values()]).toEqual([1, 1, 1, 1, 1]);
});

test("keeps occurrence parentage separate from immutable ordered derivation information", async ({
  page,
}) => {
  await page.setContent("<section><article>Sale <button>A</button></article></section>");
  class Row extends DomPageObject<null> {
    Button = DomPageObject.create(this, "button");
  }
  class Parent extends DomPageObject<null> {}
  const parent = Parent.create(page, "section");
  const source = Row.create(parent, "article");
  const filtered = source.filter({ hasText: /Sale/i });
  const selected = filtered.nth(0);
  const inspect = inspectOccurrenceForProof;
  expect(inspect(source).parent).toBe(parent);
  expect(inspect(source).derivation).toBeNull();
  const filteredInfo = inspect(filtered);
  const selectedInfo = inspect(selected);
  expect(filteredInfo.parent).toBe(parent);
  expect(filteredInfo.derivation?.source).toBe(source);
  expect(filteredInfo.derivation?.operation).toEqual({
    kind: "filter",
    options: { hasText: { source: "Sale", flags: "i" } },
  });
  expect(selectedInfo.parent).toBe(parent);
  expect(selectedInfo.derivation?.source).toBe(filtered);
  expect(selectedInfo.derivation?.operation).toEqual({ kind: "nth", index: 0 });
  expect(inspect(selected.Button).parent).toBe(selected);
  expect(inspect(selected.Button).derivation).toBeNull();
  expect(Reflect.set(selectedInfo.derivation!.operation, "index", 99)).toBe(false);
  await expect(selected.Button.locator).toHaveText("A");
});

for (const form of ["string", "supplied", "factory"] as const) {
  test(`derives a live query from a fixed ${form} target without recapturing defaults`, async ({
    page,
  }) => {
    await page.setContent('<p class="item">Before A</p><p class="item">Before B</p><b>Wrong</b>');
    let calls = 0;
    const factory: LocatorFactory = ({ page: received }) => {
      calls++;
      return received.locator(".item");
    };
    const target =
      form === "string" ? ".item" : form === "supplied" ? page.locator(".item") : factory;
    class Item extends DomPageObject<null> {
      override defaultTarget = "b";
    }
    const source = Item.create(page, target);
    const derived = source.last();
    source.defaultTarget = "html";
    expect(calls).toBe(0);
    await expect(derived.locator).toHaveText("Before B");
    expect(derived.root).toBeNull();
    expect(calls).toBe(form === "factory" ? 1 : 0);
    await page.setContent('<p class="item">After A</p><p class="item">After B</p>');
    await expect(derived.locator).toHaveText("After B");
    await expect(source.locator).toHaveCount(2);
  });
}

test("supports narrowed child declarations before ancestor defaults finish initializing", async ({
  page,
}) => {
  await page.setContent(
    '<section id="panel"><button>A</button><button>B</button></section><button>Outside</button>',
  );
  let failure: unknown;
  let calls = 0;
  class Panel extends DomPageObject<null> {
    LastButton = DomPageObject.create(this, ({ page: received, scope }) => {
      calls++;
      return (scope ?? received).locator("button");
    }).last();
    Check = (() => {
      try {
        void this.LastButton.locator;
      } catch (error) {
        failure = error;
      }
      return true;
    })();
    override readonly defaultTarget = "#panel";
  }
  const panel = Panel.create(page);
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toMatch(/initialization/i);
  expect(calls).toBe(0);
  await expect(panel.LastButton.locator).toHaveText("B");
  expect(calls).toBe(1);
});

test("retains successful-only source and derived memoization after resolution failures", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  try {
    await page.setContent("<button>A</button><button>B</button>");
    let attempt = 0;
    const source = DomPageObject.create(page, () => {
      attempt++;
      if (attempt === 1) throw new Error("Not ready");
      if (attempt === 2) return other.locator("button");
      return page.locator("button");
    });
    const derived = source.last().first();
    expect(attempt).toBe(0);
    expect(() => derived.locator).toThrow("Not ready");
    expect(() => derived.locator).toThrow(/same Page/);
    const locator = derived.locator;
    expect(derived.locator).toBe(locator);
    expect(attempt).toBe(3);
    await expect(locator).toHaveText("B");
  } finally {
    await other.close();
  }
});

test("ordinary reconstruction retains construction context and root designation", async ({
  page,
}) => {
  await page.setContent("<main><button>A</button></main><main><button>B</button></main>");
  class App extends DomPageObject<App> {
    Button = DomPageObject.create(this, "button");
    override readonly defaultTarget = "main";
  }
  await rootFixture(App)({ page }, async (app) => {
    const derived = app.last();
    expect(derived).not.toBe(app);
    expect(derived.root).toBe(derived);
    expect(derived.Button.root).toBe(derived);
    expect(app.root).toBe(app);
    expect(app.Button.root).toBe(app);
    await expect(derived.Button.locator).toHaveText("B");
    await expect(app.Button.locator).toHaveCount(2);
  });
});

test("delegates native filter criteria and frame restrictions without a page-object overload", async ({
  page,
}) => {
  await page.setContent(
    '<article>Sale <b>A</b></article><article>Other <i>B</i></article><article hidden>Archived <b>C</b></article><iframe srcdoc="<b>Frame</b>"></iframe>',
  );
  const source = DomPageObject.create(page, "article");
  await expect(source.filter({ has: page.locator("b"), visible: true }).locator).toHaveText(
    "Sale A",
  );
  await expect(source.filter({ hasNot: page.locator("b") }).locator).toHaveText("Other B");
  await expect(source.filter({ hasNotText: /Archived/, hasText: "SALE" }).locator).toHaveText(
    "Sale A",
  );
  await expect(source.filter({ visible: false }).locator).toHaveText("Archived C");
  const crossFrame = source.filter({ has: page.frameLocator("iframe").locator("b") });
  await expect(crossFrame.locator.count()).rejects.toThrow(/frame|FrameLocator/i);
});

test("rejects deriving the initializing object before reconstructing its fields recursively", async ({
  page,
}) => {
  let constructions = 0;
  let failure: unknown;
  class Early extends DomPageObject<null> {
    Attempt = (() => {
      if (++constructions > 1)
        throw new Error("Recursive reconstruction entered field initialization");
      try {
        this.first();
      } catch (error) {
        failure = error;
      }
      return true;
    })();
    override readonly defaultTarget = "button";
  }
  const source = Early.create(page);
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toMatch(/during.*initialization/i);
  expect(constructions).toBe(1);
  expect(source.locator.page()).toBe(page);
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

test("class convenience selects self and all exact tokens", async ({ page }) => {
  await page.setContent(
    '<div class="row sale featured">A</div><div class="row"><i class="sale featured"></i>B</div>',
  );
  const rows = DomPageObject.create(page, ".row");
  expect(await rows.withClass("sale", "featured").locator.allTextContents()).toEqual(["A"]);
});

test("matching uses native CSS self scope including extensions and relative intersection", async ({
  page,
}) => {
  await page.setContent(
    '<section class="list"><div id="a" class="item active">Alpha<i class="active">inside</i><div id="n" class="item active">Nested</div></div><div id="b" class="item">Beta</div></section>',
  );
  class List extends DomPageObject {
    override readonly defaultTarget = ".list";
    Item = DomPageObject.create(this, ".item");
  }
  const items = List.create(page).Item;
  const ids = (object: DomPageObject) =>
    object.locator.evaluateAll((nodes) => nodes.map((n) => n.id));
  expect(await ids(items.matching(".active"))).toEqual(["a", "n"]);
  expect(await ids(items.matching(":scope.active"))).toEqual(["a", "n"]);
  expect(await ids(items.matching("css=.active, #b"))).toEqual(["a", "n", "b"]);
  expect(await ids(items.matching(':has-text("Beta")'))).toEqual(["b"]);
  expect(await ids(items.matching("> .active"))).toEqual(["n"]);
  expect(await ids(items.matching("+ .item"))).toEqual(["b"]);
  expect(await ids(items.matching(({ scope }) => scope.locator("> .item")))).toEqual(["n"]);
  expect(await ids(items.matching(page.locator("#b")))).toEqual(["b"]);
  for (const invalid of ["text=Beta", "css=.item >> nth=0", "//div", ""])
    expect(() => items.matching(invalid)).toThrow();
});

test("exact class and raw attribute positives and negatives include literal unusual tokens", async ({
  page,
}) => {
  await page.setContent(
    '<div id="a" class="item SALE a:b x.y" data-x="Value"></div><div id="b" class="item sale" data-x=""></div><div id="c" class="item"><i data-x="Value" class="SALE"></i></div>',
  );
  const rows = DomPageObject.create(page, ".item");
  const ids = async (o: DomPageObject) => o.locator.evaluateAll((ns) => ns.map((n) => n.id));
  expect(await ids(rows.withClass("SALE", "a:b", "x.y"))).toEqual(["a"]);
  expect(await ids(rows.withoutClass("SALE", "sale"))).toEqual(["c"]);
  expect(await ids(rows.withAnyClass("SALE", "sale"))).toEqual(["a", "b"]);
  expect(await ids(rows.withAttribute("data-x"))).toEqual(["a", "b"]);
  expect(await ids(rows.withoutAttribute("data-x"))).toEqual(["c"]);
  expect(await ids(rows.withAttribute("data-x", "value"))).toEqual([]);
  expect(await ids(rows.withAttribute("data-x", ""))).toEqual(["b"]);
  expect(await ids(rows.withoutAttribute("data-x", /^value$/i))).toEqual(["b", "c"]);
  for (const token of ["", "two words", "a\tb", "a\nb", "a\fb", "a\rb"])
    for (const method of ["withClass", "withoutClass", "withAnyClass"] as const)
      expect(() => rows[method](token)).toThrow();
  expect(() => Reflect.apply(rows.withClass, rows, [])).toThrow();
  await page.locator("#c").evaluate((n) => n.classList.add('quote"', "back\\slash", "a\u00a0b"));
  expect(await ids(rows.withClass('quote"', "back\\slash", "a\u00a0b"))).toEqual(["c"]);
});

test("test-ID configuration and regex criteria capture happen before lazy resolution", async ({
  page,
}) => {
  const { selectors } = await import("@playwright/test");
  selectors.setTestIdAttribute("data-proof-id");
  await page.setContent(
    '<div id="a" class="item" data-proof-id="AbC"></div><div id="b" class="item" data-testid="AbC"></div><div id="c" class="item" data-proof-id="abc"></div>',
  );
  let calls = 0;
  const rows = DomPageObject.create(page, () => {
    calls++;
    return page.locator(".item");
  });
  const regex = /^abc$/i;
  const narrowed = rows.withTestId(regex);
  const negative = rows.withoutTestId("AbC");
  const exact = rows.withTestId("AbC");
  regex.compile("never", "");
  selectors.setTestIdAttribute("data-testid");
  expect(calls).toBe(0);
  const ids = async (o: DomPageObject) => o.locator.evaluateAll((ns) => ns.map((n) => n.id));
  expect(await ids(narrowed)).toEqual(["a", "c"]);
  expect(await ids(exact)).toEqual(["a"]);
  expect(await ids(negative)).toEqual(["b", "c"]);
  expect(calls).toBe(1);
  selectors.setTestIdAttribute("data-testid");
});

test("test-ID adapter decodes quoted and multi-attribute names and rejects malformed shapes", async ({
  page,
}) => {
  const { selectors } = await import("@playwright/test");
  await page.setContent(
    '<div id="a" class="item" data-proof="ID"></div><div id="b" class="item" other="ID"></div><div id="c" class="item"></div>',
  );
  const items = DomPageObject.create(page, ".item");
  const ids = (object: DomPageObject) =>
    object.locator.evaluateAll((nodes) => nodes.map((node) => node.id));
  try {
    for (const configuration of ['"data-proof"', "'data-proof'", " data-proof "]) {
      selectors.setTestIdAttribute(configuration);
      expect(
        await page.getByTestId("ID").evaluateAll((nodes) => nodes.map((node) => node.id)),
      ).toEqual(["a"]);
      expect(await ids(items.withTestId("ID"))).toEqual(["a"]);
      expect(await ids(items.withoutTestId("ID"))).toEqual(["b", "c"]);
    }
    selectors.setTestIdAttribute("data-proof,other");
    const positive = items.withTestId(/^ID$/);
    const negative = items.withoutTestId("ID");
    selectors.setTestIdAttribute("data-testid");
    expect(await ids(positive)).toEqual(["a", "b"]);
    expect(await ids(negative)).toEqual(["c"]);
    for (const malformed of ["data-proof=x", "data-proof] >> css=.item", '"data-proof']) {
      selectors.setTestIdAttribute(malformed);
      expect(() => items.withTestId("ID")).toThrow(/unsupported.*encoding/i);
      expect(() => items.withoutTestId("ID")).toThrow(/unsupported.*encoding/i);
    }
  } finally {
    selectors.setTestIdAttribute("data-testid");
  }
});

test("native text visibility and own role retain Playwright semantics", async ({ page }) => {
  await page.setContent(
    '<div id="a" class="item">HELLO <b>world</b></div><button id="b" class="item" aria-label="Buy" aria-description="cheap">BUY</button><div id="c" class="item" style="display:none">hello world<button>Buy</button></div><button id="d" class="item" aria-hidden="true">Buy</button><input id="e" class="item" type="checkbox" checked>',
  );
  const rows = DomPageObject.create(page, ".item");
  const ids = async (o: DomPageObject) => o.locator.evaluateAll((ns) => ns.map((n) => n.id));
  expect(await ids(rows.withText("hello world"))).toEqual(["a", "c"]);
  expect(await ids(rows.withoutText(/buy/i))).toEqual(["a", "e"]);
  expect(await ids(rows.hidden())).toEqual(["c"]);
  expect(await ids(rows.visible())).toEqual(["a", "b", "d", "e"]);
  expect(await ids(rows.withRole("button", { name: "Buy", exact: true }))).toEqual(["b"]);
  expect(await ids(rows.withRole("button", { includeHidden: true }))).toEqual(["b", "d"]);
  expect(await ids(rows.withRole("checkbox", { checked: true }))).toEqual(["e"]);
  let names = 0,
    descriptions = 0;
  const name = /^Buy$/;
  const description = /cheap/;
  const options = Object.create({
    get name() {
      names++;
      return name;
    },
    get description() {
      descriptions++;
      return description;
    },
  }) as { name: RegExp; description: RegExp };
  const selected = rows.withRole("button", options);
  name.compile("never");
  description.compile("never");
  expect(names).toBe(1);
  expect(descriptions).toBe(1);
  expect(await ids(selected)).toEqual(["b"]);
});

test("conveniences reconstruct fresh application children and ordered captured lineage", async ({
  page,
}) => {
  await page.setContent('<div class="item sale" data-x="Value"><span>child</span></div>');
  class Item extends DomPageObject {
    override readonly defaultTarget = ".item";
    Child = DomPageObject.create(this, "span");
    state = 1;
    #private = 0;
    increment() {
      return ++this.#private;
    }
    onSale(): this {
      return this.withClass("sale");
    }
  }
  const source = Item.create(page);
  source.state = 9;
  source.increment();
  const tokens: [string, ...string[]] = ["sale"];
  const regex = /^value$/i;
  const byClass = source.withClass(...tokens);
  tokens[0] = "never";
  const selected = byClass.withAttribute("data-x", regex);
  regex.compile("never");
  expect(selected).toBeInstanceOf(Item);
  expect(selected).not.toBe(source);
  expect(selected.state).toBe(1);
  expect(selected.increment()).toBe(1);
  expect(selected.Child).not.toBe(source.Child);
  expect(await selected.Child.locator.textContent()).toBe("child");
  expect(inspectOccurrenceForProof(selected).derivation).toMatchObject({
    source: byClass,
    operation: {
      kind: "withAttribute",
      criteria: { name: "data-x", value: { source: "^value$", flags: "i" } },
    },
  });
  expect(inspectOccurrenceForProof(byClass).derivation).toMatchObject({
    source,
    operation: { kind: "withClass", criteria: ["sale"] },
  });
  expect(inspectOccurrenceForProof(source.onSale()).derivation?.operation.kind).toBe("withClass");
  await page.locator(".item").evaluate((n) => n.classList.remove("sale"));
  expect(await selected.locator.count()).toBe(0);
});

test("matching factories are lazy retryable source scoped and enforce ownership", async ({
  page,
  context,
}) => {
  await page.setContent('<div class="item active">A</div>');
  let targetCalls = 0,
    factoryCalls = 0;
  const source = DomPageObject.create(page, () => {
    targetCalls++;
    return page.locator(".item");
  });
  const selected = source.matching(({ page: actual, scope }) => {
    expect(actual).toBe(page);
    expect(scope).toBe(source.locator);
    if (++factoryCalls === 1) throw new Error("retry");
    return page.locator(".active");
  });
  expect([targetCalls, factoryCalls]).toEqual([0, 0]);
  expect(() => selected.locator).toThrow("retry");
  expect(await selected.locator.count()).toBe(1);
  expect([targetCalls, factoryCalls]).toEqual([1, 2]);
  const other = await context.newPage();
  expect(() => source.matching(other.locator("div")).locator).toThrow("same Page");
  const cyclic: DomPageObject = source.matching(() => cyclic.locator);
  expect(() => cyclic.locator).toThrow("Cyclic");
  const asyncFactory = source.matching((async () => page.locator("div")) as unknown as (c: {
    page: typeof page;
    scope: typeof source.locator;
  }) => typeof source.locator);
  expect(() => asyncFactory.locator).toThrow("synchronous");
});

test("same-frame predicates shadow DOM and native frame composition limitations", async ({
  page,
}) => {
  await page.setContent(
    '<div id="host"></div><iframe srcdoc="<button class=item data-x=ok>Frame</button>"></iframe><button class="item">Outer</button>',
  );
  await page.locator("#host").evaluate((host) => {
    host.attachShadow({ mode: "open" }).innerHTML =
      '<button class="item sale" data-x="ok">Shadow</button>';
  });
  const rows = DomPageObject.create(page, ".item");
  expect(await rows.withClass("sale").withRole("button").locator.allTextContents()).toEqual([
    "Shadow",
  ]);
  const frame = page.frames()[1]!;
  await frame.locator(".item").waitFor();
  const direct = DomPageObject.create(page, frame.locator(".item"));
  expect(
    await direct
      .withRole("button")
      .withAttribute("data-x", "ok")
      .matching(".item")
      .locator.allTextContents(),
  ).toEqual(["Frame"]);
  expect(() => rows.matching(frame.locator(".item")).locator).toThrow("same frame");
  const viaFrameLocator = DomPageObject.create(page, page.frameLocator("iframe").locator(".item"));
  expect(await viaFrameLocator.withClass("item").locator.allTextContents()).toEqual(["Frame"]);
  expect(await viaFrameLocator.withRole("button").locator.count()).toBe(1);
  expect(await viaFrameLocator.matching(".item").locator.count()).toBe(1);
});

test("own role includes the document element source", async ({ page }) => {
  await page.setContent("<main>inside</main>");
  await page.locator("html").evaluate((html) => html.setAttribute("role", "application"));
  const root = DomPageObject.create(page, "html");
  expect(await root.withRole("application").locator.count()).toBe(1);
});

test("native role snapshot preserves nested frame roots including html", async ({ page }) => {
  await page.setContent('<iframe id="outer"></iframe>');
  const outer = page.frames()[1]!;
  await outer.setContent('<iframe id="inner"></iframe>');
  const inner = outer.childFrames()[0]!;
  await inner.setContent('<button class="item">Nested</button>');
  await inner.locator("html").evaluate((html) => html.setAttribute("role", "application"));
  const frame = page.frameLocator("#outer").frameLocator("#inner");
  expect(
    await DomPageObject.create(page, frame.locator("html")).withRole("application").locator.count(),
  ).toBe(1);
  expect(
    await DomPageObject.create(page, frame.locator(".item"))
      .withRole("button", { name: "Nested", exact: true })
      .matching(".item")
      .locator.count(),
  ).toBe(1);
});
