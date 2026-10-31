/** Synthetic regression fixture, never a production package.
 * @module @pomeranian/proof-core
 */

/** Nullable root contract.
 * @since @pomeranian/proof-core@Unreleased
 */
export type Root = {
  /** Root identity. */
  readonly id: string;
} | null;

/** Generic-root fixture; compare {@link "@pomeranian/proof-extension".Widget}.
 * @since @pomeranian/proof-core@1.2.3
 * @remarks Changed in @pomeranian/proof-core@1.4.0: added an extension hook.
 */
export class Widget<R extends Root = Root> {
  /** Mutable fixture label.
   * @since @pomeranian/proof-core@Unreleased
   */
  label = "core";

  /** Protected subclass hook.
   * @since @pomeranian/proof-core@Unreleased
   */
  protected transform<T>(value: T): T {
    return value;
  }

  /** Scalar overload.
   * @since @pomeranian/proof-core@1.2.3
   * @example
   * ```ts
   * const widget = new Widget();
   * widget.map("value");
   * ```
   */
  map<T>(value: T): {
    /** Scalar value. */
    value: T;
    /** Optional root. */
    root?: R;
  };
  /** Sequence overload.
   * @since @pomeranian/proof-core@Unreleased
   */
  map<T>(
    value: readonly T[],
    mode: "many",
  ): {
    /** Sequence values. */
    values: readonly T[];
    /** Optional root. */
    root?: R;
  };
  map<T>(value: T | readonly T[], mode?: "many"): object {
    return mode === "many" ? { values: value } : { value: this.transform(value) };
  }
}
