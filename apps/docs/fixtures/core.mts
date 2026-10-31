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

  /** Static collision fixture.
   * @since @pomeranian/proof-core@Unreleased
   */
  static identify(): "static" {
    return "static";
  }

  /** Instance collision fixture.
   * @since @pomeranian/proof-core@Unreleased
   */
  identify(): "instance" {
    return "instance";
  }

  /** Getter documentation.
   * @since @pomeranian/proof-core@Unreleased
   */
  get title(): string {
    return this.label;
  }
  /** Setter documentation.
   * @since @pomeranian/proof-core@Unreleased
   */
  set title(value: string) {
    this.label = value;
  }

  /** Callable property, distinct from a method.
   * @since @pomeranian/proof-core@Unreleased
   */
  onValue: <T>(value: T) => T = <T,>(value: T): T => value;

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

/** Conditional mapped root result.
 * @since @pomeranian/proof-core@Unreleased
 */
export type RootShape<R extends Root> = {
  /** Optional root field. */
  readonly [K in keyof NonNullable<R>]?: NonNullable<R>[K];
} & {
  /** Root association. */
  kind: R extends null ? "unbound" : "rooted";
};

/** Infer an item from a sequence.
 * @since @pomeranian/proof-core@Unreleased
 */
export type ItemOf<T> = T extends readonly (infer Item)[] ? Item : never;
