import { PageObject, type Constructor } from "../src/index.js";
import type { Page } from "playwright-core";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Check<T extends true> = T;
function Tagged<T extends Constructor>(Base: T) {
  return class extends Base {
    tag() {
      return "tagged";
    }
  };
}
class Named extends PageObject.with(Tagged) {
  original = 7;
}
export function contracts(page: Page) {
  const instance = Named.create(page);
  const exact: Check<Equal<typeof instance, Named>> = true;
  type Parameters = ConstructorParameters<typeof Named>;
  const context: Parameters[0] = page;
  return [exact, instance.tag(), context];
}

import {
  DomPageObject,
  checkLibrary,
  defaultInstanceType,
  rootFixture,
  type UnboundRoot,
} from "../src/index.js";
import type { Locator } from "playwright-core";
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
function Dependent<T extends Constructor<{ tag(): string }>>(Base: T) {
  return class extends Base {
    dependent() {
      return this.tag().length;
    }
  };
}
function Located<T extends Constructor<{ locator: Locator }>>(Base: T) {
  return class extends Base {
    query() {
      return this.locator;
    }
  };
}
function First<T extends Constructor>(Base: T) {
  return class extends Base {
    first = 1;
  };
}
function Middle<T extends Constructor>(Base: T) {
  return class extends Base {
    middle = 4;
  };
}
function Last<T extends Constructor>(Base: T) {
  return class extends Base {
    last = 8;
  };
}
function Bundle<T extends Constructor>(Base: T) {
  return Dependent(Tagged(Base));
}
function Fifth<T extends Constructor>(Base: T) {
  return class extends Base {
    fifth = 5;
  };
}
function Sixth<T extends Constructor>(Base: T) {
  return class extends Base {
    sixth = 6;
  };
}
function Seventh<T extends Constructor>(Base: T) {
  return class extends Base {
    seventh = 7;
  };
}
class Eight extends PageObject.with(
  First,
  Tagged,
  Dependent,
  Middle,
  Fifth,
  Sixth,
  Seventh,
  Last,
) {}
export type ContributionProofs = [
  Check<Equal<ReturnType<Named["tag"]>, string>>,
  Check<Equal<ReturnType<Eight["dependent"]>, number>>,
  Check<Equal<Eight["first"], number>>,
  Check<Equal<Eight["middle"], number>>,
  Check<Equal<Eight["last"], number>>,
  Check<Equal<IsAny<ReturnType<Eight["tag"]>>, false>>,
  Check<Equal<IsNever<ReturnType<Eight["dependent"]>>, false>>,
];
class Three extends DomPageObject.with(Tagged, Dependent, Located) {}
class Own extends Eight {
  static own = "static";
  own = true;
  ownMethod() {
    return this.own;
  }
}
class Further extends Own.with(
  (Base) =>
    class extends Base {
      further = true;
    },
) {}
class Bundled extends PageObject.with(Bundle) {}
// @ts-expect-error Required tag is absent.
PageObject.with(Dependent);
// @ts-expect-error Order is significant.
PageObject.with(Dependent, Tagged);
// @ts-expect-error DOM requirement is absent on a group.
PageObject.with(Located);
// @ts-expect-error Requirement is still missing at the end of a longer list.
PageObject.with(First, Middle, Last, First, Middle, Last, First, Dependent);

export class Generic<
  Root extends UnboundRoot = UnboundRoot,
  Value = string,
  Other = boolean,
> extends DomPageObject.with(Tagged, Dependent, Located)<Root> {
  declare readonly [defaultInstanceType]: {
    instance: Generic;
    parameters: { root: Root; value: Value; other: Other };
  };
  override get root(): Root {
    return super.root;
  }
  override defaultTarget = "button";
  #value: Value | undefined = undefined;
  #other: Other | undefined = undefined;
  value(): Value | undefined {
    return this.#value;
  }
  other(): Other | undefined {
    return this.#other;
  }
}
checkLibrary<Generic>()(Generic);
class App extends DomPageObject.with(Tagged, Dependent)<App> {
  app = true;
}
class Bound extends Generic<App, number, Date> {}
class Nullable extends Generic<App | null, number, Date> {}
class Standalone extends Generic<null> {}
class WrongApp extends PageObject<WrongApp> {
  incompatible = true;
}
export async function fullContracts(page: Page, app: App, wrong: WrongApp, locator: Locator) {
  Bundled.create(page).dependent();
  const eight = Eight.create(page);
  const three = Three.create(page, "button");
  const further = Further.create(page);
  const plain = Generic.create(page);
  const bound = Bound.create(app);
  const nullable = Nullable.create(page);
  const standalone = Standalone.create(page);
  const assertions: [
    Check<Equal<typeof eight, Eight>>,
    Check<Equal<typeof three, Three>>,
    Check<Equal<typeof further, Further>>,
    Check<Equal<typeof plain, Generic>>,
    Check<Equal<typeof bound, Bound>>,
    Check<Equal<typeof bound.root, App>>,
    Check<Equal<typeof nullable.root, App | null>>,
    Check<Equal<typeof standalone.root, null>>,
    Check<Equal<ReturnType<typeof plain.value>, string | undefined>>,
    Check<Equal<ReturnType<typeof plain.other>, boolean | undefined>>,
    Check<Equal<ReturnType<typeof bound.value>, number | undefined>>,
    Check<Equal<ReturnType<typeof bound.other>, Date | undefined>>,
    Check<Equal<IsAny<typeof bound>, false>>,
    Check<Equal<IsNever<typeof bound>, false>>,
    Check<Equal<IsAny<typeof bound.root>, false>>,
    Check<Equal<IsNever<typeof bound.root>, false>>,
  ] = [
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ];
  eight.fifth;
  eight.sixth;
  eight.seventh;
  eight.first;
  eight.middle;
  eight.last;
  eight.tag();
  eight.dependent();
  further.own;
  further.ownMethod();
  further.further;
  Further.own;
  Nullable.create(app);
  Generic.create(page, locator);
  Generic.create(page, ({ page }) => page.locator("button"));
  // @ts-expect-error Exact application context required.
  Bound.create(page);
  // @ts-expect-error Incompatible root.
  Bound.create(wrong);
  // @ts-expect-error Groups forbid targets after composition.
  Eight.create(page, "button");
  // @ts-expect-error Required target remains required after composition.
  Three.create(page);
  // @ts-expect-error Standalone context cannot contain a designated application root.
  Standalone.create(app);
  // @ts-expect-error Independent private generic parameters remain invariant.
  const mismatched: Generic<App, string, Date> = bound;
  // @ts-expect-error A library cannot be designated as its unrelated application root.
  rootFixture(Bound);
  await rootFixture(App)({ page }, async (root) => {
    const exact: Check<Equal<typeof root, App>> = true;
    return void exact;
  });
  return [assertions, mismatched, three.query()];
}
