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
     * @param text Text to append after the current value, ignoring caret and selection.
     * @param options Native fill options: force bypasses actionability checks,
     * timeout applies independently to the preliminary read and native fill (not a
     * shared total budget), signal cancels both stages, and deprecated noWaitAfter
     * has no effect at the supported Playwright pin.
     * @since @pomeranian/lib-essential@Unreleased
     */
    async appendText(text: string, options?: Parameters<Locator["fill"]>[1]): Promise<void> {
      if (typeof text !== "string") throw new TypeError("appendText requires string text");
      const locator = this.locator;
      const value = await locator.evaluate(
        (node) => {
          if (node.tagName === "TEXTAREA") return (node as HTMLTextAreaElement).value;
          if (node.tagName === "INPUT") {
            const input = node as HTMLInputElement;
            if (["text", "search", "email", "password", "tel", "url"].includes(input.type))
              return input.value;
          }
          throw new Error("appendText requires a native text-like input or textarea");
        },
        undefined,
        {
          ...(options?.timeout === undefined ? {} : { timeout: options.timeout }),
          ...(options?.signal === undefined ? {} : { signal: options.signal }),
        },
      );
      await locator.fill(value + text, options);
    }
  };
}
