import { captureFilter } from "./internal/narrowing.js";
import { reconstruct } from "./internal/reconstruction.js";
import { cssTarget } from "./internal/css-target.js";
import type { Locator, Page } from "playwright-core";
import { PageObject } from "./page-object.js";
import { defaultInstanceType, type UnboundRoot } from "./authoring.js";
import { state, inheritedScope, assertReady } from "./internal/state.js";
import type { Target } from "./target.js";
/** DOM-associated page object with a lazy native Locator.
 * @since @pomeranian/core@Unreleased
 */
export class DomPageObject<Root extends UnboundRoot = UnboundRoot> extends PageObject<Root> {
  /** Generic factory metadata.
   * @since @pomeranian/core@Unreleased
   */
  declare readonly [defaultInstanceType]: { instance: DomPageObject; parameters: { root: Root } };
  /** Instance default used when no explicit target was supplied.
   * @since @pomeranian/core@Unreleased
   */
  readonly defaultTarget: Target | undefined = undefined;
  #locator: Locator | undefined;
  #target: Target | undefined;
  #resolving = false;
  /** Technically public for capabilities; construct through named create/rootFixture.
   * Inherit the constructor; defaults are captured after subclass fields complete.
   * @remarks Changed in @pomeranian/core@Unreleased: public constructor authoring enables
   * generic capability factories; supported construction still uses named factories.
   * @since @pomeranian/core@Unreleased
   */
  constructor(context: Page | PageObject<Root>, target?: Target, asRoot = false) {
    super(context, target, asRoot);
    state(this).scope = () => this.locator;
    state(this).finalize = () => {
      const selected = target !== undefined ? target : this.defaultTarget;
      const value = selected === undefined && asRoot ? "html" : selected;
      if (value === undefined) throw new Error("A DOM target is required.");
      if (
        typeof value !== "string" &&
        typeof value !== "function" &&
        (!value ||
          typeof value !== "object" ||
          !("page" in value) ||
          typeof value.page !== "function" ||
          !("count" in value) ||
          typeof value.count !== "function" ||
          !("locator" in value) ||
          typeof value.locator !== "function")
      )
        throw new Error("A target must be a CSS string, Locator, or locator factory.");
      this.#target = typeof value === "string" ? cssTarget(value) : value;
    };
  }

  /** Return a fresh concrete instance selecting the first match, without resolving the query.
   * Ordinary fields and children initialize again; accumulated state is not copied.
   * @returns A fresh instance retaining the concrete API and root type.
   * @since @pomeranian/core@Unreleased
   */
  first(): this {
    return reconstruct(this, (locator) => locator.first(), { kind: "first" });
  }

  /** Return a fresh concrete instance selecting the last match.
   * @returns A fresh instance with reinitialized fields and children.
   * @since @pomeranian/core@Unreleased
   */
  last(): this {
    return reconstruct(this, (locator) => locator.last(), { kind: "last" });
  }
  /** Return a fresh concrete instance selecting a native zero-based index.
   * @param index Native index; -1 selects the last match.
   * @returns A fresh instance; empty/out-of-range matches remain valid queries.
   * @since @pomeranian/core@Unreleased
   */
  nth(index: number): this {
    return reconstruct(this, (locator) => locator.nth(index), { kind: "nth", arguments: [index] });
  }

  /** Return a fresh instance using native Playwright filter semantics.
   * Supported option values are captured once, including inherited getters and
   * RegExp contents. Containment arguments are raw relative Locators, not page objects;
   * native frame restrictions apply. Query evaluation remains lazy and live.
   * @param options Native filter criteria; omission retains every source match.
   * @returns A fresh instance preserving the concrete API, root and generic parameters.
   * @since @pomeranian/core@Unreleased
   */
  filter(options?: Parameters<Locator["filter"]>[0]): this {
    const captured = captureFilter(options);
    return reconstruct(this, (locator) => locator.filter(captured.options), {
      kind: "filter",
      arguments: [captured.description],
    });
  }

  /** A live native query, memoized only after successful validation.
   * Access rejects while this object or an ancestor initializes. Factory, result,
   * ownership and cycle failures leave the query retryable. Native operations
   * determine DOM existence, cardinality and full CSS grammar validity.
   * @since @pomeranian/core@Unreleased
   */
  get locator(): Locator {
    assertReady(this);
    if (this.#locator) return this.#locator;
    if (this.#resolving) throw new Error("Cyclic target resolution.");
    this.#resolving = true;
    try {
      const target = this.#target;
      const value =
        typeof target === "string"
          ? (inheritedScope(this) ?? this.page).locator(target)
          : typeof target === "function"
            ? target({ page: this.page, scope: inheritedScope(this) })
            : target;
      if (
        !value ||
        typeof value !== "object" ||
        !("page" in value) ||
        typeof value.page !== "function" ||
        !("locator" in value) ||
        typeof value.locator !== "function" ||
        !("count" in value) ||
        typeof value.count !== "function"
      )
        throw new Error("Target resolution must return a synchronous Playwright Locator.");
      if (value.page() !== this.page) throw new Error("The Locator must belong to the same Page.");
      return (this.#locator = value as Locator);
    } finally {
      this.#resolving = false;
    }
  }
}
