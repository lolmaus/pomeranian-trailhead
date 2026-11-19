import { DomPageObject, PageObject, defaultInstanceType } from "../src/index.js";
import type { Page } from "playwright-core";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Check<T extends true> = T;
class App extends DomPageObject<App> {}
class Row<T extends string = "default"> extends DomPageObject<App> {
  declare readonly [defaultInstanceType]: { instance: Row; parameters: { root: App; value: T } };
  declare value: T;
  active(): this {
    return this.filter({ visible: true });
  }
}
export function evidence(page: Page, row: Row<"bound">) {
  const result = row.first().last().nth(0).filter({ hasText: /yes/ }).active();
  const exact: Check<Equal<typeof result, Row<"bound">>> = true;
  void exact;
  // @ts-expect-error Groups have no DOM narrowing.
  PageObject.create(page).first();
  // @ts-expect-error Containment uses raw Locators.
  row.filter({ has: row });
  // @ts-expect-error Index is numeric.
  row.nth("1");
}
