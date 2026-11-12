import type { DomPageObject } from "./dom-page-object.js";
import type { Page } from "playwright-core";
import type { Class, Result } from "./authoring.js";
import type { PageObject } from "./page-object.js";
import type { Target } from "./target.js";
import { finish } from "./internal/state.js";
/** Create a designated application tree before child fields initialize.
 * Use the returned callback with Playwright Test's test.extend.
 * @since @pomeranian/core@Unreleased
 */
export function rootFixture<C extends Class>(
  Class: C & (Result<C> extends Result<C>["root"] ? unknown : never),
  ...[target]: Result<C> extends DomPageObject<import("./authoring.js").UnboundRoot>
    ? [target?: Target]
    : []
) {
  return async ({ page }: { page: Page }, use: (app: Result<C>) => Promise<void>) => {
    const object = Reflect.construct(Class, [page, target, true]) as PageObject;
    finish(object);
    await use(object as Result<C>);
  };
}
