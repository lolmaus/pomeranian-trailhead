import type { Locator } from "playwright-core";
import type { Constructor } from "@pomeranian/core/authoring";
import { Checkable } from "./checkable.js";
/** Reusable native CheckableUncheckable capability.
 * @since @pomeranian/lib-essential@Unreleased
 */
export function CheckableUncheckable<T extends Constructor<{ readonly locator: Locator }>>(
  Base: T,
) {
  return class extends Checkable(Base) {
    /** Complete native uncheck action, retaining applicability, options, waiting and errors.
     * @since @pomeranian/lib-essential@Unreleased
     */
    uncheck(...args: Parameters<Locator["uncheck"]>): ReturnType<Locator["uncheck"]> {
      return this.locator.uncheck(...args);
    }
    /** Complete native setChecked action, retaining applicability, options, waiting and errors.
     * @since @pomeranian/lib-essential@Unreleased
     */
    setChecked(...args: Parameters<Locator["setChecked"]>): ReturnType<Locator["setChecked"]> {
      return this.locator.setChecked(...args);
    }
  };
}
