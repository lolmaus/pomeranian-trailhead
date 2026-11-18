import type { Locator } from "playwright-core";
import type { Constructor } from "@pomeranian/core/authoring";
import { Fillable } from "./fillable.js";
/** Reusable native EditableValue capability.
 * @since @pomeranian/lib-essential@Unreleased
 */
export function EditableValue<T extends Constructor<{ readonly locator: Locator }>>(Base: T) {
  return class extends Fillable(Base) {
    /** Complete native clear action, retaining applicability, options, waiting and errors.
     * @since @pomeranian/lib-essential@Unreleased
     */
    clear(...args: Parameters<Locator["clear"]>): ReturnType<Locator["clear"]> {
      return this.locator.clear(...args);
    }
  };
}
