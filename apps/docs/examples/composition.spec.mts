import { expect, test } from "@playwright/test";
import { DomPageObject, PageObject, rootFixture } from "@pomeranian/core";
import {
  checkLibrary,
  defaultInstanceType,
  type Constructor,
  type UnboundRoot,
} from "@pomeranian/core/authoring";
import type { Locator } from "playwright-core";

// #region capabilities
// Require the features the implementation actually uses. This says nothing
// about the live DOM node's tag, applicability or actionability.
function Text<T extends Constructor<{ locator: Locator }>>(Base: T) {
  return class extends Base {
    async expectText(value: string) {
      await expect(this.locator).toHaveText(value);
    }
  };
}
interface Counted {
  increment(): number;
}
function Counting<T extends Constructor>(Base: T): Constructor<Counted> & T {
  return class extends Base {
    #count = 0;
    increment() {
      return ++this.#count;
    }
  };
}
function CountLabel<T extends Constructor<Counted>>(Base: T) {
  return class extends Base {
    countLabel() {
      return `count: ${this.increment()}`;
    }
  };
}
// The later capability requires an earlier contribution.
class Message extends DomPageObject.with(Text, Counting, CountLabel) {
  override defaultTarget = "p";
}
// Bundles can share ordinary factory implementations transitively.
function CountedLabel<T extends Constructor>(Base: T) {
  return CountLabel(Counting(Base));
}
class MessageGroup extends PageObject.with(CountedLabel) {}
// #endregion capabilities

test("named capabilities and dependent bundles preserve factory behavior", async ({ page }) => {
  await page.setContent("<p>Ready</p>");
  const message = Message.create(page);
  await message.expectText("Ready");
  expect(message.countLabel()).toBe("count: 1");
  expect(Message.create(page).increment()).toBe(1);
  expect(MessageGroup.create(page).countLabel()).toBe("count: 1");
});

// #region generic-composition
class LibraryMessage<
  Root extends UnboundRoot = UnboundRoot,
  Value = string,
  Other = boolean,
> extends DomPageObject.with(Text, Counting, CountLabel)<Root> {
  declare readonly [defaultInstanceType]: {
    instance: LibraryMessage;
    parameters: { root: Root; value: Value; other: Other };
  };
  // Scoped to generic composed wrappers: recover the declared Root exactly.
  override get root(): Root {
    return super.root;
  }
  override defaultTarget = "p";
  #value: Value | undefined = undefined;
  #other: Other | undefined = undefined;
  value(): Value | undefined {
    return this.#value;
  }
  other(): Other | undefined {
    return this.#other;
  }
}
checkLibrary<LibraryMessage>()(LibraryMessage);
class LibraryApp extends PageObject<LibraryApp> {
  app = true;
}
class BoundMessage extends LibraryMessage<LibraryApp, number, Date> {}
// Ordinary classes and concrete descendants need no forwarding getter or
// repeated metadata when they introduce no independent generic parameters.
// #endregion generic-composition

test("generic composed wrappers preserve defaults and bound roots", async ({ page }) => {
  const plain = LibraryMessage.create(page);
  const value: string | undefined = plain.value();
  const other: boolean | undefined = plain.other();
  expect([value, other]).toEqual([undefined, undefined]);
  await rootFixture(LibraryApp)({ page }, async (app) => {
    const bound = BoundMessage.create(app);
    const value: number | undefined = bound.value();
    const root: LibraryApp = bound.root;
    expect(value).toBeUndefined();
    expect(root).toBe(app);
  });
});

// #region capability-children
function WithButton<T extends Constructor<PageObject>>(Base: T) {
  return class extends Base {
    SeenRoot = this.root;
    Button = DomPageObject.create(this, "button.original");
    // Capturing preserves the earlier child even if a subclass replaces Button.
    Captured = this.Button;
    button() {
      return this.Button;
    }
    description() {
      return "button";
    }
  };
}
class Panel extends DomPageObject.with(WithButton)<Panel> {
  override Button = DomPageObject.create(this, "button.replacement");
  override defaultTarget = "section";
  override description() {
    return `${super.description()} panel`;
  }
}
const panelTest = test.extend<{ panel: Panel }>({ panel: rootFixture(Panel) });
// #endregion capability-children

panelTest(
  "capability children initialize before compatible concrete replacements",
  async ({ page, panel }) => {
    await page.setContent(
      '<section><button class="original">Before</button><button class="replacement">After</button></section>',
    );
    expect(panel.SeenRoot).toBe(panel);
    expect(panel.Captured.root).toBe(panel);
    expect(panel.Button.root).toBe(panel);
    expect(panel.Captured).not.toBe(panel.Button);
    expect(panel.button()).toBe(panel.Button);
    expect(panel.description()).toBe("button panel");
    await expect(panel.Captured.locator).toHaveText("Before");
    await expect(panel.button().locator).toHaveText("After");
  },
);
