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
  /** Inherit the protected constructor; defaults are captured after subclass fields complete.
   * @since @pomeranian/core@Unreleased
   */
  protected constructor(context: Page | PageObject<Root>, target?: Target, asRoot = false) {
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
