import { PageObject, type Constructor } from "../src/index.js";
import type { Page } from "playwright-core";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Check<T extends true> = T;
function Tagged<T extends Constructor>(Base: T) {
  return class extends Base {
    tag() {
      return "tagged";
    }
  };
}
class Named extends PageObject.with(Tagged) {
  original = 7;
}
export function contracts(page: Page) {
  const instance = Named.create(page);
  const exact: Check<Equal<typeof instance, Named>> = true;
  const accessible = new Named(page);
  return [exact, instance.tag(), accessible];
}
