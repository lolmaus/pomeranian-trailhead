// THROWAWAY #10: evidence for a decision, not a production package.
import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  DomPageObject,
  PageObject,
  rootFixture,
  type Target,
  type LocatorFactory,
} from "./probe.mts";

test("memoizes a Locator while its DOM matches remain live", async ({ page }) => {
  await page.setContent('<button id="save">Before</button>');
  const object = DomPageObject.create(page, "#save");
  const first = object.locator;
  expect(object.locator).toBe(first);
  await expect(first).toHaveText("Before");
  await page.setContent('<button id="save">After replacement</button>');
  await expect(object.locator).toHaveText("After replacement");
});

test("reports a cyclic factory query without overflowing or poisoning later resolution", async ({
  page,
}) => {
  let recursive = true;
  let calls = 0;
  const object: DomPageObject = DomPageObject.create(page, () => {
    calls++;
    return recursive ? object.locator : page.locator("button");
  });
  expect(() => object.locator).toThrow(/cyclic/i);
  expect(calls).toBe(1);
  recursive = false;
  expect(object.locator.page()).toBe(page);
  expect(calls).toBe(2);
});

test("invalid explicit targets do not fall back to an instance default", async ({ page }) => {
  class Button extends DomPageObject<null> {
    override defaultTarget = "button";
  }
  for (const target of [null, false, 0, {}, page, page.frameLocator("iframe"), "", "css="]) {
    expect(() => Button.create(page, target as Target)).toThrow(/target|CSS/i);
  }
});

test("rejects non-CSS string engines and selector-engine chains", async ({ page }) => {
  for (const selector of [
    "text=Save",
    "xpath=//button",
    "//button",
    "'Save'",
    "button >> span",
    "css=button >> css=span",
    "css:light=button",
  ]) {
    expect(() => DomPageObject.create(page, selector), selector).toThrow(/CSS/);
  }
});

for (const form of ["supplied", "factory"] as const) {
  test(`rejects a ${form} Locator from another Page`, async ({ page, context }) => {
    const other = await context.newPage();
    try {
      const locator = other.locator("button");
      const target: Target = form === "supplied" ? locator : () => locator;
      const object = DomPageObject.create(page, target);
      expect(() => object.locator).toThrow(/same Page/);
    } finally {
      await other.close();
    }
  });
}

test("blocks even a supplied Locator during ancestor initialization without poisoning it", async ({
  page,
}) => {
  await page.setContent('<section id="panel"><button id="save">Save</button></section>');
  let failure: unknown;
  class Group extends PageObject<null> {
    Save = DomPageObject.create(this, page.locator("#save"));
  }
  class Panel extends DomPageObject<null> {
    Group = Group.create(this);
    EarlyAccess = (() => {
      try {
        void this.Group.Save.locator;
      } catch (error) {
        failure = error;
      }
      return true;
    })();
    override defaultTarget = "#panel";
  }
  const panel = Panel.create(page);
  expect(failure instanceof Error && /initializ/i.test(failure.message)).toBe(true);
  await expect(panel.Group.Save.locator).toHaveText("Save");
});

test("captures the completed own default before first Locator access", async ({ page }) => {
  await page.setContent(
    '<button id="original">Original</button><button id="changed">Changed</button>',
  );
  class Button extends DomPageObject<null> {
    override defaultTarget = "#original";
  }
  const button = Button.create(page);
  // Deliberately mutate the declaration to verify that this cannot retarget it.
  button.defaultTarget = "#changed";
  await expect(button.locator).toHaveText("Original");
});

test("factory resolution is lazy and forwards a late parent scope through groups", async ({
  page,
}) => {
  await page.setContent('<section id="panel"><button>Save</button></section><button>Save</button>');
  let calls = 0;
  const target = ({ page: receivedPage, scope }: { page: Page; scope: Locator | null }) => {
    calls++;
    expect(receivedPage).toBe(page);
    expect(scope).not.toBeNull();
    return (scope ?? receivedPage).getByRole("button", { name: "Save" });
  };
  class Group extends PageObject<null> {
    Save = DomPageObject.create(this, target);
  }
  class Panel extends DomPageObject<null> {
    Group = Group.create(this);
    override defaultTarget = "#panel";
  }
  const panel = Panel.create(page);
  expect(calls).toBe(0);
  await expect(panel.Group.Save.locator).toHaveCount(1);
  expect(panel.Group.Save.locator === panel.Group.Save.locator).toBe(true);
  expect(calls).toBe(1);
});

test("preserves selector lists, explicit self, child, and outside sibling CSS", async ({
  page,
}) => {
  await page.setContent(
    '<main><section id="parent"><button id="a" class="a">A</button><div><button id="b" class="b">B</button></div></section><button id="outside" class="a">Outside</button><section id="other"></section></main>',
  );
  const parent = DomPageObject.create(page, "#parent");
  const cases: [string, string[]][] = [
    [".a, .b", ["a", "b"]],
    ["css=.a", ["a"]],
    [":scope", ["parent"]],
    [":scope > .a", ["a"]],
    ["> .a", ["a"]],
    [":scope + .a", ["outside"]],
    ["+ .a", ["outside"]],
    [":scope ~ section", ["other"]],
    [":is(:scope, .a)", ["parent", "a"]],
    ["#parent", []],
    ["body .a", []],
  ];
  for (const [selector, ids] of cases) {
    const child = DomPageObject.create(parent, selector);
    expect(
      await child.locator.evaluateAll((elements) => elements.map((element) => element.id)),
      selector,
    ).toEqual(ids);
  }
});

test("preserves CSS extensions, quoted arrows and escapes, and open shadow DOM", async ({
  page,
}) => {
  await page.setContent(
    '<section id="panel"><button data-code="x>>y">Say "yes" >> go</button><button hidden>Hidden</button><div id="host"></div></section>',
  );
  await page.locator("#host").evaluate((host) => {
    host.attachShadow({ mode: "open" }).innerHTML = '<button class="shadow">Shadow</button>';
  });
  const panel = DomPageObject.create(page, "#panel");
  await expect(DomPageObject.create(panel, '[data-code="x>>y"]').locator).toHaveCount(1);
  await expect(
    DomPageObject.create(panel, String.raw`button:has-text("Say \"yes\" >> go")`).locator,
  ).toHaveCount(1);
  await expect(DomPageObject.create(panel, "button:visible").locator).toHaveCount(2);
  await expect(DomPageObject.create(panel, ".shadow").locator).toHaveText("Shadow");
});

test("uses null factory scope through standalone groups and a targetless group root", async ({
  page,
}) => {
  await page.setContent("<button>Save</button>");
  let calls = 0;
  const factory: LocatorFactory = ({ page: received, scope }) => {
    calls++;
    expect(received).toBe(page);
    expect(scope).toBeNull();
    return received.getByRole("button");
  };
  class Group extends PageObject<null> {
    Child = DomPageObject.create(this, factory);
  }
  class Outer extends PageObject<null> {}
  await expect(Group.create(Outer.create(page)).Child.locator).toHaveText("Save");
  class GroupRoot extends PageObject<GroupRoot> {
    Child = DomPageObject.create(this, factory);
  }
  await rootFixture(GroupRoot)({ page }, async (root) => {
    expect(root.root).toBe(root);
    await expect(root.Child.locator).toHaveText("Save");
  });
  expect(calls).toBe(2);
});

test("only a designated DOM root falls back to html", async ({ page }) => {
  await page.setContent("<body><button>Save</button></body>");
  class App extends DomPageObject<App> {
    Child = DomPageObject.create(this, "button");
  }
  await rootFixture(App)({ page }, async (app) => {
    expect(app.root).toBe(app);
    expect(await app.locator.evaluate((element) => element.tagName)).toBe("HTML");
    await expect(app.Child.locator).toHaveText("Save");
  });
  expect(() => DomPageObject.create(page, undefined as unknown as Target)).toThrow(/target/i);
});

test("retains supplied Locator identity, including inside a frame on the same Page", async ({
  page,
}) => {
  await page.setContent(
    '<iframe srcdoc="<button>Inside</button>"></iframe><section id="unrelated"></section>',
  );
  const supplied = page.frameLocator("iframe").getByRole("button");
  const parent = DomPageObject.create(page, "#unrelated");
  const object = DomPageObject.create(parent, supplied);
  expect(object.locator === supplied).toBe(true);
  expect(object.page).toBe(page);
  await expect(object.locator).toHaveText("Inside");
});

test("retries throwing and invalid factory results and caches only the successful Locator", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  try {
    const valid = page.locator("button");
    const results: unknown[] = [
      null,
      "button",
      page,
      page.frameLocator("iframe"),
      Promise.resolve(valid),
      other.locator("button"),
      valid,
    ];
    let attempt = 0;
    const factory = (() => {
      if (attempt++ === 0) throw new Error("Configuration not ready");
      return results[attempt - 2];
    }) as LocatorFactory;
    const object = DomPageObject.create(page, factory);
    expect(() => object.locator).toThrow("Configuration not ready");
    for (let index = 0; index < results.length - 1; index++) {
      expect(() => object.locator).toThrow();
    }
    expect(object.locator === valid).toBe(true);
    expect(object.locator === valid).toBe(true);
    expect(attempt).toBe(8);
  } finally {
    await other.close();
  }
});

test("does not query matches or claim full CSS validity when constructing a Locator", async ({
  page,
}) => {
  const absent = DomPageObject.create(page, ".not-rendered-yet");
  expect(absent.locator === absent.locator).toBe(true);
  await expect(absent.locator).toHaveCount(0);
  const malformed = DomPageObject.create(page, "button[");
  const locator = malformed.locator;
  expect(malformed.locator === locator).toBe(true);
  await expect(locator.count()).rejects.toThrow();
});

test("uses independent application roots for separate Pages", async ({ page, context }) => {
  const other = await context.newPage();
  try {
    await page.setContent('<main id="app"><button>First Page</button></main>');
    await other.setContent('<main id="app"><button>Second Page</button></main>');
    class App extends DomPageObject<App> {
      Button = DomPageObject.create(this, "button");
      override readonly defaultTarget = "#app";
    }
    await rootFixture(App)({ page }, async (first) => {
      await rootFixture(App)({ page: other }, async (second) => {
        expect(first.root).toBe(first);
        expect(second.root).toBe(second);
        expect(first.root === second.root).toBe(false);
        expect(first.page).toBe(page);
        expect(second.page).toBe(other);
        await expect(first.Button.locator).toHaveText("First Page");
        await expect(second.Button.locator).toHaveText("Second Page");
      });
    });
  } finally {
    await other.close();
  }
});

test("fresh children consume a supplied narrowed parent query without rebasing explicit global inputs", async ({
  page,
}) => {
  await page.setContent(
    '<section class="row"><button>A</button></section><section class="row"><button>B</button></section><button id="global">Global</button>',
  );
  const supplied = page.locator("#global");
  class Row extends DomPageObject<null> {
    StringChild = DomPageObject.create(this, "button");
    ScopedFactory = DomPageObject.create(this, ({ page: received, scope }) =>
      (scope ?? received).getByRole("button"),
    );
    GlobalFactory = DomPageObject.create(this, ({ page: received }) => received.locator("#global"));
    SuppliedChild = DomPageObject.create(this, supplied);
  }
  const source = Row.create(page, ".row");
  // A supplied .nth() query exercises the target seam, not a reconstruction API.
  const narrowed = Row.create(page, source.locator.nth(1));
  expect(narrowed.StringChild === source.StringChild).toBe(false);
  await expect(source.StringChild.locator).toHaveCount(2);
  await expect(narrowed.StringChild.locator).toHaveText("B");
  await expect(narrowed.ScopedFactory.locator).toHaveText("B");
  await expect(narrowed.GlobalFactory.locator).toHaveText("Global");
  expect(narrowed.SuppliedChild.locator === supplied).toBe(true);
});

test("explicit inputs override every default form without invoking an overridden factory", async ({
  page,
}) => {
  await page.setContent(
    '<button id="default">Default</button><button id="explicit">Explicit</button>',
  );
  let defaultCalls = 0;
  class StringDefault extends DomPageObject<null> {
    override readonly defaultTarget = "#default";
  }
  class LocatorDefault extends DomPageObject<null> {
    override readonly defaultTarget = this.page.locator("#default");
  }
  class FactoryDefault extends DomPageObject<null> {
    override readonly defaultTarget: LocatorFactory = () => {
      defaultCalls++;
      return this.page.locator("#default");
    };
  }
  const overrides: Target[] = [
    "#explicit",
    page.locator("#explicit"),
    ({ page: received }) => received.locator("#explicit"),
  ];
  for (const target of overrides) {
    for (const object of [
      StringDefault.create(page, target),
      LocatorDefault.create(page, target),
      FactoryDefault.create(page, target),
    ]) {
      await expect(object.locator).toHaveText("Explicit");
    }
  }
  expect(defaultCalls).toBe(0);
  for (const object of [
    StringDefault.create(page),
    LocatorDefault.create(page),
    FactoryDefault.create(page),
  ]) {
    await expect(object.locator).toHaveText("Default");
  }
  expect(defaultCalls).toBe(1);
});

test("inherited child declarations use the completed subclass default", async ({ page }) => {
  await page.setContent(
    '<section id="base"><b>Base</b></section><section id="derived"><b>Derived</b></section>',
  );
  class Base extends DomPageObject<null> {
    Child = DomPageObject.create(this, "b");
    override readonly defaultTarget: string = "#base";
  }
  class Derived extends Base {
    override readonly defaultTarget = "#derived";
  }
  await expect(Derived.create(page).Child.locator).toHaveText("Derived");
});

test("blocks Locator access from the object's own field initialization", async ({ page }) => {
  let failure: unknown;
  class Early extends DomPageObject<null> {
    EarlyAccess = (() => {
      try {
        void this.locator;
      } catch (error) {
        failure = error;
      }
      return true;
    })();
  }
  const object = Early.create(page, "button");
  expect(failure instanceof Error && /initializ/i.test(failure.message)).toBe(true);
  expect(object.locator.page()).toBe(page);
});

test("rejects target arguments to groups even when TypeScript is bypassed", async ({ page }) => {
  // @ts-expect-error Deliberately exercise invalid JavaScript input.
  expect(() => PageObject.create(page, "button")).toThrow(/group/i);
});
