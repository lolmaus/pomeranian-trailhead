import type { DomPageObject } from "./dom-page-object.js";
import type { Page } from "playwright-core";
import type { PageObject } from "./page-object.js";
import type { Target } from "./target.js";
/** Structural application-root contract.
 * @since @pomeranian/core@Unreleased
 */
export interface RootReference {
  /** Associated native Page. @since @pomeranian/core@Unreleased */
  readonly page: Page;
  /** Application association or null. @since @pomeranian/core@Unreleased */
  readonly root: RootReference | null;
}
/** Safe neutral association for reusable libraries.
 * @since @pomeranian/core@Unreleased
 */
export type UnboundRoot = RootReference | null;
/** Type-only metadata key for exact generic factory defaults.
 * @since @pomeranian/core@Unreleased
 */
export const defaultInstanceType: unique symbol = Symbol("default instance type");
/** Constructor accepted by ordinary generic class-factory capabilities.
 * The variadic any signature is TypeScript's required mixin constructor form;
 * concrete factory results retain the receiver's exact constructor and metadata.
 * @since @pomeranian/core@Unreleased
 */
export type Constructor<Instance = object> = new (...args: any[]) => Instance;
/** Factory receiver with a page-object prototype.
 * @since @pomeranian/core@Unreleased
 */
export type Class = Function & { prototype: PageObject<UnboundRoot> };
type Default<I extends PageObject<UnboundRoot>> = I[typeof defaultInstanceType]["instance"];
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Erased<Args extends object> = true extends { [K in keyof Args]: IsAny<Args[K]> }[keyof Args]
  ? true
  : false;

/** Exact concrete or declared-default instance selected by an inherited factory.
 * @since @pomeranian/core@Unreleased
 */
export type Result<C extends Class> =
  Erased<C["prototype"][typeof defaultInstanceType]["parameters"]> extends true
    ? Default<C["prototype"]> extends C["prototype"]
      ? Default<C["prototype"]>
      : never
    : C["prototype"];
type IsAny<T> = 0 extends 1 & T ? true : false;
/** Compatible parent context; Page is accepted only when the root may be null.
 * @since @pomeranian/core@Unreleased
 */
export type Context<Root extends UnboundRoot> =
  IsAny<Root> extends true ? never : null extends Root ? Page | PageObject<Root> : PageObject<Root>;
/** Target arguments required by DOM classes and omitted for groups.
 * @since @pomeranian/core@Unreleased
 */
export type TargetArguments<Instance> =
  Instance extends DomPageObject<UnboundRoot>
    ? Instance extends { defaultTarget: Target }
      ? [target?: Target]
      : [target: Target]
    : [];

/** Check bare-instance factory conformance. This compiler check does not enforce author source restrictions.
 * @since @pomeranian/core@Unreleased
 */
export function checkLibrary<Expected extends PageObject<UnboundRoot>>() {
  return <C extends Class>(
    Class: C &
      (Equal<Result<C>, Expected> extends true ? unknown : never) &
      (C extends typeof PageObject<Expected["root"]> ? unknown : never),
  ): C => Class;
}
