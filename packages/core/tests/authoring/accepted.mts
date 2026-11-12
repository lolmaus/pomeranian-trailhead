import type { Page } from "playwright-core";
import {
  DomPageObject,
  PageObject,
  defaultInstanceType,
  checkLibrary,
  type UnboundRoot,
} from "../../src/index.js";
export class Library<R extends UnboundRoot = UnboundRoot, Value = string> extends DomPageObject<R> {
  declare readonly [defaultInstanceType]: {
    instance: Library;
    parameters: { root: R; value: Value };
  };
  override readonly defaultTarget = "button";
  #value: Value | undefined = undefined;
  value(): Value | undefined {
    return this.#value;
  }
}
checkLibrary<Library>()(Library);
export class App extends DomPageObject<App> {}
export class Bound extends Library<App, number> {}
export function contracts(page: Page, app: App) {
  const plain = Library.create(page);
  const value: string | undefined = plain.value();
  const bound = Bound.create(app);
  const number: number | undefined = bound.value();
  // @ts-expect-error Exact generic default must not erase to any.
  const wrong: number = plain.value();
  // @ts-expect-error Bound app classes require compatible rooted parents.
  Bound.create(page);
  // @ts-expect-error Inherited constructor stays protected.
  new Bound(page);
  class LocatorGroup extends PageObject {
    locator = page.locator("button");
  }
  // @ts-expect-error A Locator member does not change a group into the DOM target family.
  LocatorGroup.create(page, "button");
  return [value, number, wrong];
}
