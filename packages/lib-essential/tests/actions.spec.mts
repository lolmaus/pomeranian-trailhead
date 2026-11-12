import { test, expect } from "@playwright/test";
import { Element } from "../src/element.js";
test("inherits standalone construction and explicit targets", async ({ page }) => {
  await page.setContent("<button>Ready</button>");
  const button = Element.create(page, "button");
  expect(button.root).toBeNull();
  await expect(button.locator).toHaveText("Ready");
  // @ts-expect-error a standalone Element requires a target
  expect(() => Element.create(page)).toThrow("target");
});
test("click preserves native effects", async ({ page }) => {
  await page.setContent("<button oncontextmenu=\"this.textContent='clicked'\">Ready</button>");
  const button = Element.create(page, "button, input, textarea");
  expect(typeof (button as unknown as { [key: string]: unknown })["click"]).toBe("function");
  await (button as unknown as { click: import("playwright-core").Locator["click"] }).click({
    button: "right",
  });
  await expect(button.locator).toHaveText("clicked");
});
test("dblclick preserves native effects", async ({ page }) => {
  await page.setContent("<button ondblclick=\"this.textContent='double'\">Ready</button>");
  const button = Element.create(page, "button, input, textarea");
  expect(typeof (button as unknown as { [key: string]: unknown })["dblclick"]).toBe("function");
  await (
    button as unknown as { dblclick: import("playwright-core").Locator["dblclick"] }
  ).dblclick();
  await expect(button.locator).toHaveText("double");
});
test("hover preserves native effects", async ({ page }) => {
  await page.setContent("<button onmouseenter=\"this.textContent='hovered'\">Ready</button>");
  const button = Element.create(page, "button, input, textarea");
  expect(typeof (button as unknown as { [key: string]: unknown })["hover"]).toBe("function");
  await (button as unknown as { hover: import("playwright-core").Locator["hover"] }).hover();
  await expect(button.locator).toHaveText("hovered");
});
test("focus preserves native effects", async ({ page }) => {
  await page.setContent("<input>");
  const button = Element.create(page, "button, input, textarea");
  expect(typeof (button as unknown as { [key: string]: unknown })["focus"]).toBe("function");
  await (button as unknown as { focus: import("playwright-core").Locator["focus"] }).focus();
  await expect(button.locator).toBeFocused();
});
test("blur preserves native effects", async ({ page }) => {
  await page.setContent("<input>");
  const button = Element.create(page, "button, input, textarea");
  expect(typeof (button as unknown as { [key: string]: unknown })["blur"]).toBe("function");
  await button.locator.focus();
  await (button as unknown as { blur: import("playwright-core").Locator["blur"] }).blur();
  await expect(button.locator).not.toBeFocused();
});
test("press preserves native effects", async ({ page }) => {
  await page.setContent("<input value='ab'>");
  const button = Element.create(page, "button, input, textarea");
  expect(typeof (button as unknown as { [key: string]: unknown })["press"]).toBe("function");
  await button.locator.focus();
  await (button as unknown as { press: import("playwright-core").Locator["press"] }).press("End");
  await (button as unknown as { press: import("playwright-core").Locator["press"] }).press(
    "ArrowLeft",
  );
  await (button as unknown as { press: import("playwright-core").Locator["press"] }).press("X");
  await expect(button.locator).toHaveValue("aXb");
});
test("pressSequentially preserves native effects", async ({ page }) => {
  await page.setContent("<input>");
  const button = Element.create(page, "button, input, textarea");
  expect(typeof (button as unknown as { [key: string]: unknown })["pressSequentially"]).toBe(
    "function",
  );
  await (
    button as unknown as {
      pressSequentially: import("playwright-core").Locator["pressSequentially"];
    }
  ).pressSequentially("Hello", { delay: 1 });
  await expect(button.locator).toHaveValue("Hello");
});
test("type preserves native effects", async ({ page }) => {
  await page.setContent("<textarea></textarea>");
  const button = Element.create(page, "button, input, textarea");
  expect(typeof (button as unknown as { [key: string]: unknown })["type"]).toBe("function");
  await (button as unknown as { type: import("playwright-core").Locator["type"] }).type("legacy", {
    delay: 1,
  });
  await expect(button.locator).toHaveValue("legacy");
});

test("native cardinality, applicability and timeout errors remain visible", async ({ page }) => {
  await page.setContent("<button>A</button><button>B</button><div>Text</div>");
  await expect(Element.create(page, "button").click({ timeout: 100 })).rejects.toThrow(
    "strict mode",
  );
  await expect(Element.create(page, "#missing").hover({ timeout: 100 })).rejects.toThrow("Timeout");
  await expect(
    Element.create(page, "div").pressSequentially("text", { timeout: 100 }),
  ).resolves.toBeUndefined();
});

import { createRequire } from "node:module";
import {
  DomPageObject,
  PageObject,
  rootFixture,
  defaultInstanceType,
  type UnboundRoot,
} from "@pomeranian/core";
const require = createRequire(import.meta.url);
const { reconstruct } = require("../../core/dist/internal/reconstruction.js") as {
  reconstruct<T extends DomPageObject>(
    source: T,
    transform: (locator: import("playwright-core").Locator) => import("playwright-core").Locator,
  ): T;
};
test("subclasses preserve grouping, roots, private state and reconstruction", async ({ page }) => {
  class Button<Root extends UnboundRoot = UnboundRoot, Value = string> extends Element<Root> {
    declare readonly [defaultInstanceType]: {
      instance: Button;
      parameters: { root: Root; value: Value };
    };
    override defaultTarget = "button";
    #value: Value | undefined;
    value() {
      return this.#value;
    }
  }
  class Group extends PageObject<App> {
    Button = Button.create(this);
  }
  class App extends DomPageObject<App> {
    override defaultTarget = "main";
    Group = Group.create(this);
  }
  await page.setContent(
    "<main><button>A</button><button onclick=\"this.textContent='Done'\">B</button></main>",
  );
  await rootFixture(App)({ page }, async (app) => {
    const source = app.Group.Button;
    const derived = reconstruct(source, (l) => l.nth(1));
    expect(derived).toBeInstanceOf(Button);
    expect(derived.root).toBe(app);
    expect(derived.value()).toBeUndefined();
    await derived.click();
    await expect(derived.locator).toHaveText("Done");
    await expect(source.locator).toHaveCount(2);
  });
});
