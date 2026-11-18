import type { Locator } from "playwright-core";
import type { Constructor } from "@pomeranian/core/authoring";
/** Reusable native Checkable capability.
 * @since @pomeranian/lib-essential@Unreleased
 */
export function Checkable<T extends Constructor<{ readonly locator: Locator }>>(Base: T) {
  return class extends Base {
    /** Complete native check action, retaining applicability, options, waiting and errors.
     * @since @pomeranian/lib-essential@Unreleased
     */
    check(...args: Parameters<Locator["check"]>): ReturnType<Locator["check"]> {
      return this.locator.check(...args);
    }
  };
}
