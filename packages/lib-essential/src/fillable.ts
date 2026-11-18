import type { Locator } from "playwright-core";
import type { Constructor } from "@pomeranian/core/authoring";
/** Reusable native Fillable capability.
 * @since @pomeranian/lib-essential@Unreleased
 */
export function Fillable<T extends Constructor<{ readonly locator: Locator }>>(Base: T) {
  return class extends Base {
    /** Complete native fill action, retaining applicability, options, waiting and errors.
     * @since @pomeranian/lib-essential@Unreleased
     */
    fill(...args: Parameters<Locator["fill"]>): ReturnType<Locator["fill"]> {
      return this.locator.fill(...args);
    }
  };
}
