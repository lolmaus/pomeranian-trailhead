import type { Page } from "playwright-core";
import {
  defaultInstanceType,
  type Class,
  type Constructor,
  type Result,
  type Context,
  type TargetArguments,
  type UnboundRoot,
} from "./authoring.js";
import type { Target } from "./target.js";
import { states, state, finish } from "./internal/state.js";
// Homomorphic tuple inference captures each contribution separately. A capability's
// base is the original receiver intersected with every preceding contribution.
type Compose<C, Added extends readonly unknown[]> = Added extends readonly [
  infer Head,
  ...infer Tail,
]
  ? Compose<Constructor<Head> & C, Tail>
  : C;
type Before<
  Added extends readonly unknown[],
  Index,
  Seen extends unknown[] = [],
> = `${Seen["length"]}` extends Index
  ? Seen
  : Added extends readonly [infer Head, ...infer Tail]
    ? Before<Tail, Index, [...Seen, Head]>
    : Seen;
type Capabilities<C, Added extends readonly unknown[]> = {
  [K in keyof Added]: (
    base: Compose<C, Before<Added, K>>,
  ) => Constructor<Added[K]> & Compose<C, Before<Added, K>>;
};
/** A target-independent group that shares Page and application context.
 * @since @pomeranian/core@Unreleased
 */
export class PageObject<Root extends UnboundRoot = UnboundRoot> {
  /** Declare fresh complete metadata in generic library subclasses.
   * @since @pomeranian/core@Unreleased
   */
  declare readonly [defaultInstanceType]: { instance: PageObject; parameters: { root: Root } };
  /** Technically public for class-factory capabilities; direct new is unsupported.
   * Inherit this constructor and initialize state in ordinary fields.
   * @remarks Changed in @pomeranian/core@Unreleased: public constructor authoring enables
   * generic capability factories; supported construction still uses named factories.
   * @since @pomeranian/core@Unreleased
   */
  constructor(context: Page | PageObject<Root>, target?: Target, asRoot = false) {
    const parent = context instanceof PageObject ? context : null;
    states.set(this, {
      page: parent ? parent.page : (context as Page),
      parent,
      root: asRoot ? this : (parent?.root ?? null),
      concrete: new.target,
      asRoot,
      complete: false,
      explicit: target,
    });
  }
  /** The native Page associated with this tree.
   * @since @pomeranian/core@Unreleased
   */
  get page(): Page {
    return state(this).page;
  }
  /** The designated application anchor, or null for a standalone tree.
   * @since @pomeranian/core@Unreleased
   */
  get root(): Root {
    return state(this).root as Root;
  }
  /** Apply capabilities left to right through genuine subclass construction.
   * Each factory receives the preceding constructor; the receiver stays unchanged.
   * Name the returned class before using create or rootFixture.
   * @since @pomeranian/core@Unreleased
   */
  static with<C extends Constructor<PageObject>, const Added extends readonly unknown[]>(
    this: C,
    ...capabilities: Capabilities<C, Added>
  ): Compose<C, Added>;
  static with(
    this: Constructor<PageObject>,
    ...capabilities: readonly unknown[]
  ): Constructor<PageObject> {
    let current = this;
    for (const capability of capabilities) {
      current = (capability as (base: Constructor<PageObject>) => Constructor<PageObject>)(current);
    }
    return current;
  }
  /** Construct a fresh concrete instance with ordinary field initialization.
   * @since @pomeranian/core@Unreleased
   */
  static create<C extends Class>(
    this: C,
    context: Context<Result<C>["root"]>,
    ...[target]: TargetArguments<Result<C>>
  ): Result<C> {
    const object = Reflect.construct(this, [context, target, false]) as PageObject;
    finish(object);
    return object as Result<C>;
  }
}
