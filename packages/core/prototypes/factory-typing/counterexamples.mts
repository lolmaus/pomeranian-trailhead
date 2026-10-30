// These functions are deliberately NEVER EXECUTED. A green compile establishes
// that the candidate still accepts unsound calls. They are evidence, not usage.
import { ValueButton as ImportedValueButton } from "./contracts.mts";
import type { Page } from "@playwright/test";
import { Element, LibraryButton, checkLibrary, type UnboundRoot, App } from "./probe.mts";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Check<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

class UndeclaredValue<Value = string> extends LibraryButton<null> {
  readonly #value: Value | undefined;
  protected constructor(context: Page, target?: string, asRoot = false) {
    super(context, target, asRoot);
    this.#value = undefined;
  }
  value(): Value | undefined {
    return this.#value;
  }
}
class RequiredState extends Element<App> {
  readonly #state: { label: string };
  protected constructor(context: Element<App>, state: { label: string }) {
    super(context, "button");
    this.#state = state;
  }
  label(): string {
    return this.#state.label;
  }
}
export function unresolved(page: Page, app: App) {
  const unsafe = UndeclaredValue.create(page);
  type AnyLeak = Check<Equal<IsAny<ReturnType<typeof unsafe.value>>, true>>;
  // Accepted despite the class's string default. Nominal private state survives,
  // but the erased independent parameter makes it assignable to a numeric class.
  const falseNumeric: UndeclaredValue<number> = unsafe;
  // Accepted, but the constructor receives a string where state was required.
  const invalidState = RequiredState.create(app, "button");
  // Explicit constructor instantiation still does not bind the inherited factory.
  const unbound = (LibraryButton<App>).create(page);
  type StillNeutral = Check<Equal<typeof unbound.root, UnboundRoot>>;
  void [falseNumeric, invalidState, unbound];
}

// The proposed mandatory checks catch the independent-generic and constructor
// hazards, but TypeScript DOES NOT require authors to call this helper.
// @ts-expect-error Independent parameter metadata was omitted, so Result has any.
checkLibrary<UndeclaredValue>()(UndeclaredValue);
// @ts-expect-error A required custom constructor state violates shared construction.
checkLibrary<RequiredState>()(RequiredState);

class NarrowDefault<R extends UnboundRoot = App> extends LibraryButton<R> {}
// @ts-expect-error The conformance check rejects a stale default declaration.
checkLibrary<NarrowDefault>()(NarrowDefault);

// Replacing string with an unrelated number default is NOT supported by this
// covariant metadata representation. Preserve the actual diagnostic as evidence.
export class NumericDefault<
  R extends UnboundRoot = UnboundRoot,
  Value = number,
> extends ImportedValueButton<R, Value> {
  // @ts-expect-error A numeric default instance is not a subtype of the inherited string default.
  declare readonly [defaultInstanceType]: {
    instance: NumericDefault;
    parameters: { root: R; value: Value };
  };
}
