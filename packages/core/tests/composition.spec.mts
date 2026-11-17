import { test, expect } from "@playwright/test";
import { PageObject } from "../src/page-object.ts";

test("page objects expose inherited capability composition", () => {
  expect("with" in PageObject && typeof PageObject.with).toBe("function");
});

import type { Constructor } from "../src/authoring.ts";
function Tagged<T extends Constructor>(Base: T) {
  return class extends Base {
    tag() {
      return "tagged";
    }
  };
}
test("a named composed class keeps its receiver and contributes real inherited methods", ({
  page,
}) => {
  class Base extends PageObject {
    original() {
      return 7;
    }
  }
  class Named extends Base.with(Tagged) {}
  const instance = Named.create(page);
  expect(instance).toBeInstanceOf(Named);
  expect(instance).toBeInstanceOf(Base);
  expect(instance.original()).toBe(7);
  expect(instance.tag()).toBe("tagged");
  expect("tag" in Base.prototype).toBe(false);
});

test("flat capabilities apply left to right with the preceding constructor", () => {
  const received: Function[] = [];
  const produced: Function[] = [];
  function capability<T extends Constructor>(Base: T) {
    received.push(Base);
    class Contribution extends Base {}
    produced.push(Contribution);
    return Contribution;
  }
  // Reflect exercises runtime arity independently of the compiler contract.
  Reflect.apply(PageObject.with, PageObject, [capability, capability, capability]);
  expect(received).toEqual([PageObject, produced[0], produced[1]]);
});

import { DomPageObject } from "../src/dom-page-object.ts";
import { rootFixture } from "../src/root-fixture.ts";
function Children<T extends Constructor<PageObject>>(Base: T) {
  return class extends Base {
    SeenRoot = this.root;
    Child = DomPageObject.create(this, "button.original");
    Captured = this.Child;
    Guarded = (() => {
      try {
        void this.Child.locator;
        return false;
      } catch {
        return true;
      }
    })();
    #count = 0;
    increment() {
      return ++this.#count;
    }
    child() {
      return this.Child;
    }
    label() {
      return "base";
    }
  };
}
test("capability fields inherit early root identity and concrete overrides with late defaults", async ({
  page,
}) => {
  class App extends DomPageObject.with(Children)<App> {
    override Child = DomPageObject.create(this, "button.replacement");
    override defaultTarget = "section";
    override label() {
      return `${super.label()}:concrete`;
    }
  }
  await page.setContent(
    '<section><button class="original">Original</button><button class="replacement">Replacement</button></section><aside><button class="replacement">Explicit</button></aside>',
  );
  await rootFixture(App)({ page }, async (app) => {
    expect(app.SeenRoot).toBe(app);
    expect(app.Captured.root).toBe(app);
    expect(app.Child.root).toBe(app);
    expect(app.Captured).not.toBe(app.Child);
    expect(app.child()).toBe(app.Child);
    expect(app.Guarded).toBe(true);
    expect(app.label()).toBe("base:concrete");
    await expect(app.Captured.locator).toHaveText("Original");
    await expect(app.child().locator).toHaveText("Replacement");
    const other = App.create(app, page.locator("aside"));
    expect(app.increment()).toBe(1);
    expect(app.increment()).toBe(2);
    expect(other.increment()).toBe(1);
    await expect(other.Child.locator).toHaveText("Explicit");
  });
});

test("standalone composed grouping trees keep null roots and forward DOM scope", async ({
  page,
}) => {
  class Group extends PageObject.with(Children) {}
  class Parent extends DomPageObject {
    Group = Group.create(this);
  }
  await page.setContent(
    '<section><button class="original">Scoped</button></section><button class="original">Outside</button>',
  );
  const parent = Parent.create(page, "section");
  expect(parent.root).toBeNull();
  expect(parent.Group.SeenRoot).toBeNull();
  expect(parent.Group.Child.root).toBeNull();
  await expect(parent.Group.Child.locator).toHaveText("Scoped");
});
