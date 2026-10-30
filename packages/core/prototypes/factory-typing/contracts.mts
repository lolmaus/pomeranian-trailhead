import type { Page } from "@playwright/test";
import {
  LibraryButton,
  Element,
  PageObject,
  App,
  checkLibrary,
  defaultInstanceType,
  rootFixture,
  type UnboundRoot,
} from "./probe.mts";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Check<T extends true> = T;

// Same API/defaults, runtime subclass identity is retained. There is no nominal
// distinction in TypeScript without new private state or a distinct type shape.
export class Styled<R extends UnboundRoot = UnboundRoot> extends LibraryButton<R> {
  override defaultTarget = "button.styled";
}
export class NarrowDefault<R extends UnboundRoot = App> extends LibraryButton<R> {}
export class Restricted<R extends App = App> extends LibraryButton<R> {
  declare readonly [defaultInstanceType]: { instance: Restricted; parameters: { root: R } };
}

// An extra independent parameter, including private state, is supported when
// declared in the parameter map. No per-app declarations are necessary.
export class ValueButton<
  R extends UnboundRoot = UnboundRoot,
  Value = string,
> extends LibraryButton<R> {
  declare readonly [defaultInstanceType]: {
    instance: ValueButton;
    parameters: { root: R; value: Value };
  };
  readonly #value: Value | undefined = undefined;
  value(): Value | undefined {
    return this.#value;
  }
}
export class AppValueButton extends ValueButton<App, number> {}
export class NullValueButton<Value = string> extends ValueButton<null, Value> {
  declare readonly [defaultInstanceType]: {
    instance: NullValueButton;
    parameters: { root: null; value: Value };
  };
}
export class Counter extends Element<App> {
  #count = 0;
  override defaultTarget = "button";
  increment(): number {
    return ++this.#count;
  }
}
export class HtmlApp extends Element<HtmlApp> {
  Child = LibraryButton.create(this);
}
export class GroupApp extends PageObject<GroupApp> {
  Child = LibraryButton.create(this);
}

export function assertions(page: Page, app: App) {
  const styled = Styled.create(page);
  type StyledExact = Check<Equal<typeof styled, Styled>>;
  // @ts-expect-error The conformance check rejects a stale default declaration.
  checkLibrary<NarrowDefault>()(NarrowDefault);
  const restricted = Restricted.create(app);
  type RestrictedExact = Check<Equal<typeof restricted, Restricted<App>>>;
  // @ts-expect-error Its default is App, so Page is incompatible.
  Restricted.create(page);
  const values = ValueButton.create(page);
  type ValuesExact = Check<Equal<typeof values, ValueButton<UnboundRoot, string>>>;
  type ValueExact = Check<Equal<ReturnType<typeof values.value>, string | undefined>>;
  // @ts-expect-error Private state retains its declared generic default.
  const wrong: ValueButton<UnboundRoot, number> = values;
  const appValue = AppValueButton.create(app);
  type BoundValueExact = Check<Equal<ReturnType<typeof appValue.value>, number | undefined>>;
  const nullValue = NullValueButton.create(page);
  type NullExact = Check<Equal<typeof nullValue, NullValueButton<string>>>;
  // @ts-expect-error An independent generic parameter stays string, not any.
  nullValue.value()?.nonexistent;
  const counter = Counter.create(app);
  type CounterExact = Check<Equal<typeof counter, Counter>>;
  // @ts-expect-error A rootless default cannot designate itself as root.
  rootFixture(NullValueButton);
  void rootFixture(HtmlApp);
  void rootFixture(GroupApp);
  // @ts-expect-error Group fixtures have no DOM target.
  rootFixture(GroupApp, ".unused");
  // @ts-expect-error A null-root class cannot consume an App-root parent.
  NullValueButton.create(app);
  void [styled, restricted, values, wrong, appValue, nullValue, counter];
}

// These checks are part of the candidate library-author contract.
checkLibrary<LibraryButton>()(LibraryButton);
checkLibrary<Styled>()(Styled);
checkLibrary<Restricted>()(Restricted);
checkLibrary<ValueButton>()(ValueButton);
checkLibrary<NullValueButton>()(NullValueButton);
checkLibrary<AppValueButton>()(AppValueButton);
checkLibrary<Counter>()(Counter);
checkLibrary<HtmlApp>()(HtmlApp);
checkLibrary<GroupApp>()(GroupApp);

// A narrower independent default is covariant with the parent's default.
export class LiteralValue<
  R extends UnboundRoot = UnboundRoot,
  Value extends string = "ok",
> extends ValueButton<R, Value> {
  declare readonly [defaultInstanceType]: {
    instance: LiteralValue;
    parameters: { root: R; value: Value };
  };
}
checkLibrary<LiteralValue>()(LiteralValue);

// Replacing string with an unrelated number default is NOT supported by this
// covariant metadata representation. Preserve the actual diagnostic as evidence.
export class NumericDefault<
  R extends UnboundRoot = UnboundRoot,
  Value = number,
> extends ValueButton<R, Value> {
  // @ts-expect-error A numeric default instance is not a subtype of the inherited string default.
  declare readonly [defaultInstanceType]: {
    instance: NumericDefault;
    parameters: { root: R; value: Value };
  };
}
