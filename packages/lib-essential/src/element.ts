import type { Locator } from "playwright-core";
import { DomPageObject } from "@pomeranian/core/dom-page-object";
import { defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";
/** A DOM element with native Playwright interactions.
 * @since @pomeranian/lib-essential@Unreleased
 */
export class Element<Root extends UnboundRoot = UnboundRoot> extends DomPageObject<Root> {
  /** Generic factory metadata.
   * @since @pomeranian/lib-essential@Unreleased
   */
  declare readonly [defaultInstanceType]: { instance: Element; parameters: { root: Root } };
  /** Perform native click, retaining Playwright waiting, options and errors.
   * @since @pomeranian/lib-essential@Unreleased
   */
  click(...args: Parameters<Locator["click"]>): ReturnType<Locator["click"]> {
    return this.locator.click(...args);
  }
  /** Perform native dblclick, retaining Playwright waiting, options and errors.
   * @since @pomeranian/lib-essential@Unreleased
   */
  dblclick(...args: Parameters<Locator["dblclick"]>): ReturnType<Locator["dblclick"]> {
    return this.locator.dblclick(...args);
  }
  /** Perform native hover, retaining Playwright waiting, options and errors.
   * @since @pomeranian/lib-essential@Unreleased
   */
  hover(...args: Parameters<Locator["hover"]>): ReturnType<Locator["hover"]> {
    return this.locator.hover(...args);
  }
}
