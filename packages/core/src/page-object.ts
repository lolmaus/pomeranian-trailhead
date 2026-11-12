import type { Page } from "playwright-core";
import {
  defaultInstanceType,
  type Class,
  type Result,
  type Context,
  type TargetArguments,
  type UnboundRoot,
} from "./authoring.js";
import type { Target } from "./target.js";
import { states, state, finish } from "./internal/state.js";
/** A target-independent group that shares Page and application context.
 * @since @pomeranian/core@Unreleased
 */
export class PageObject<Root extends UnboundRoot = UnboundRoot> {
  /** Declare fresh complete metadata in generic library subclasses.
   * @since @pomeranian/core@Unreleased
   */
  declare readonly [defaultInstanceType]: { instance: PageObject; parameters: { root: Root } };
  /** Inherit this constructor and initialize state in ordinary fields.
   * @since @pomeranian/core@Unreleased
   */
  protected constructor(context: Page | PageObject<Root>, target?: Target, asRoot = false) {
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
