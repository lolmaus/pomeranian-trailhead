import type { Locator } from "playwright-core";
import type { Constructor } from "@pomeranian/core/authoring";
/** Reusable native SelectableOptions capability.
 * @since @pomeranian/lib-essential@Unreleased
 */
export function SelectableOptions<T extends Constructor<{ readonly locator: Locator }>>(Base: T) {
  return class extends Base {
    /** Complete native selectOption action, retaining applicability, options, waiting and errors.
     * Returns the native selected option values; routine tests may ignore them.
     * @since @pomeranian/lib-essential@Unreleased
     */
    selectOption(
      ...args: Parameters<Locator["selectOption"]>
    ): ReturnType<Locator["selectOption"]> {
      return this.locator.selectOption(...args);
    }
  };
}
