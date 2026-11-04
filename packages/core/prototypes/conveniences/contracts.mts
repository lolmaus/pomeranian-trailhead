// THROWAWAY #19: checked, never executed.
import type { Page, Locator } from "@playwright/test";
import {
  DomPageObject,
  PageObject,
  defaultInstanceType,
  checkLibrary,
  type UnboundRoot,
} from "./probe.mts";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Check<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

class ValueRow<R extends UnboundRoot = UnboundRoot, Value = string> extends DomPageObject<R> {
  declare readonly [defaultInstanceType]: {
    instance: ValueRow;
    parameters: { root: R; value: Value };
  };
  override readonly defaultTarget = ".row";
  #value: Value | undefined = undefined;
  value(): Value | undefined {
    return this.#value;
  }
  byText(text: string): this {
    return this.filter({ hasText: text });
  }
}
checkLibrary<ValueRow>()(ValueRow);
class BoundRow extends ValueRow<App, number> {
  custom(): App {
    return this.root;
  }
}
class NullableRow extends ValueRow<App | null, boolean> {}
class StandaloneRow extends ValueRow<null, number> {}
class App extends DomPageObject<App> {
  Row = BoundRow.create(this);
}

export function typeEvidence(page: Page, app: App, locator: Locator) {
  const direct = ValueRow.create(page).first().last().nth(0).filter({ hasText: /Sale/i });
  const bound = app.Row.filter({ has: locator, hasNotText: "Archived", visible: true })
    .first()
    .byText("Sale");
  const nullable = NullableRow.create(page).last();
  const standalone = StandaloneRow.create(page).nth(1);
  type Direct = Check<Equal<typeof direct, ValueRow>>;
  type Bound = Check<Equal<typeof bound, BoundRow>>;
  type Root = Check<Equal<typeof bound.root, App>>;
  type Value = Check<Equal<ReturnType<typeof bound.value>, number | undefined>>;
  type Nullable = Check<Equal<typeof nullable.root, App | null>>;
  type Standalone = Check<Equal<typeof standalone.root, null>>;
  type NotAny = Check<Equal<IsAny<typeof bound>, false>>;
  const proofs: [Direct, Bound, Root, Value, Nullable, Standalone, NotAny] = [
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ];
  const exact: App = bound.custom();
  void [proofs, exact];
  // @ts-expect-error Groups do not have DOM narrowing operations.
  PageObject.create(page).first();
  // @ts-expect-error Positional narrowing keeps its numeric argument.
  bound.nth("one");
  // @ts-expect-error Filter options retain Playwright's field types.
  bound.filter({ hasText: 123 });
  // @ts-expect-error Raw Playwright has expects a Locator, not a page object.
  bound.filter({ has: app.Row });
  // @ts-expect-error Narrowing does not add unrelated methods.
  direct.custom();
  // @ts-expect-error Root binding is not weakened by narrowing.
  BoundRow.create(page).first();
  // @ts-expect-error Constructors remain protected.
  new BoundRow(app, ".row");
}

export function convenienceTypes(page: Page, app: App, locator: Locator) {
  const bound = app.Row.withClass("sale", "x")
    .withoutClass("off")
    .withAnyClass("a", "b")
    .withTestId(/id/)
    .withoutTestId("other")
    .withAttribute("title")
    .withoutAttribute("x", "y")
    .withText("Sale")
    .withoutText(/old/)
    .visible()
    .hidden()
    .matching(".row")
    .matching(locator)
    .matching(({ scope }) => scope.first())
    .withRole("button", {
      name: /buy/i,
      description: "now",
      exact: true,
      includeHidden: true,
      pressed: false,
    });
  const root: App = bound.root;
  const value: number | undefined = bound.value();
  const concrete: BoundRow = bound;
  void [root, value, concrete];
  // @ts-expect-error Must supply at least one class token.
  bound.withClass();
  // @ts-expect-error Class tokens are strings.
  bound.withAnyClass(123);
  // @ts-expect-error Role union is native.
  bound.withRole("not-a-role");
  // @ts-expect-error Native state option types retained.
  bound.withRole("button", { checked: "yes" });
  // @ts-expect-error Async matching factories unsupported.
  bound.matching(async () => locator);
  // @ts-expect-error Grouping objects have no convenience API.
  PageObject.create(page).visible();
  // @ts-expect-error No generic public subtraction.
  bound.notMatching(locator);
}
