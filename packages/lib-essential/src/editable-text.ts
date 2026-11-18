import type { Locator } from "playwright-core";
import type { Constructor } from "@pomeranian/core/authoring";
import { EditableValue } from "./editable-value.js";

/** Reusable native text editing, including fill, clear and append.
 * @since @pomeranian/lib-essential@Unreleased
 */
export function EditableText<T extends Constructor<{ readonly locator: Locator }>>(Base: T) {
  return class extends EditableValue(Base) {
    /** Append to the current value through native fill, independently of caret/selection.
     * Supports native text/search/email/password/tel/url inputs (including implicit or
     * invalid types resolved as text) and textarea. Structured inputs, labels and
     * contenteditable are rejected. Targets are checked at action time.
     * Options, waiting, constraints and errors remain native fill behavior; this does
     * not promise per-character keyboard events or rich-editor formatting preservation.
     * Reading and filling are not atomic against application edits or DOM replacement.
     * @since @pomeranian/lib-essential@Unreleased
     */
    async appendText(...args: Parameters<Locator["fill"]>): Promise<void> {
      const [text, options] = args;
      const locator = this.locator;
      const value = await locator.inputValue(
        options?.timeout === undefined ? {} : { timeout: options.timeout },
      );
      await locator.fill(value + text, options);
    }
  };
}
