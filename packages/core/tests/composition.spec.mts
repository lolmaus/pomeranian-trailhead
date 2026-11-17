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
