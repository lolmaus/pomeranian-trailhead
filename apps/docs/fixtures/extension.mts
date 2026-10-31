/** Synthetic regression fixture, never a production package.
 * @module @pomeranian/proof-extension
 */
import { Widget as CoreWidget, type Root } from "./core.mts";

/** Cross-package inheritance fixture. See {@link CoreWidget.map}.
 * @since @pomeranian/proof-extension@Unreleased
 */
export class Widget<R extends Root = Root> extends CoreWidget<R> {
  /** A public path through the inherited hook.
   * @since @pomeranian/proof-extension@Unreleased
   * @remarks Changed in @pomeranian/proof-extension@Unreleased: explicit public entry.
   */
  expose<T>(value: T): T {
    return this.transform(value);
  }
}
