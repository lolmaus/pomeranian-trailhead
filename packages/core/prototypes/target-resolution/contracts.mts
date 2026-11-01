// THROWAWAY #10: compiler evidence. This function is checked, never executed.
import type { Locator, Page } from "@playwright/test";
import {
  DomPageObject,
  PageObject,
  rootFixture,
  type Target,
  type LocatorFactory,
  type UnboundRoot,
} from "./probe.mts";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Check<T extends true> = T;

class FactoryDefault extends DomPageObject<null> {
  override readonly defaultTarget: LocatorFactory = ({ page, scope }) =>
    (scope ?? page).getByRole("button", { name: "Save" });
}
class LocatorDefault extends DomPageObject<null> {
  override readonly defaultTarget: Locator = this.page.locator("button");
}
class StringDefault extends DomPageObject<null> {
  override readonly defaultTarget = "button";
}
class App extends DomPageObject<App> {
  Item = DomPageObject.create(this, ".item");
}
class AppBound extends DomPageObject<App> {
  appOnly(): Locator {
    return this.root.Item.locator;
  }
}

export function typeEvidence(page: Page, supplied: Locator, app: App) {
  const factory: LocatorFactory = (context) => {
    const optionalScope: Locator | null = context.scope;
    if (context.scope) {
      // @ts-expect-error Scope is a Locator, never a Page.
      const wrongPage: Page = context.scope;
      void wrongPage;
    }
    // @ts-expect-error Context inputs are read-only.
    context.scope = null;
    // @ts-expect-error No page-object/root input is exposed by factory context.
    void context.root;
    return (optionalScope ?? context.page).locator("button");
  };
  const targets: Target[] = ["button", supplied, factory];
  for (const target of targets) {
    const direct = DomPageObject.create(page, target);
    type Exact = Check<Equal<typeof direct, DomPageObject<UnboundRoot>>>;
    const exact: Exact = true;
    const locator: Locator = direct.locator;
    void [locator, exact];
  }
  FactoryDefault.create(page);
  LocatorDefault.create(page);
  StringDefault.create(page);
  FactoryDefault.create(page, supplied);
  LocatorDefault.create(page, factory);
  StringDefault.create(page, supplied);
  const bound = AppBound.create(app, factory);
  type BoundExact = Check<Equal<typeof bound, AppBound>>;
  const boundExact: BoundExact = true;
  const root: App = bound.root;
  void [root, boundExact];
  rootFixture(App);
  rootFixture(App, supplied);
  rootFixture(App, factory);
  PageObject.create(page);

  // @ts-expect-error An ordinary DOM object with no definite default needs a target.
  DomPageObject.create(page);
  // @ts-expect-error Groups do not accept targets.
  PageObject.create(page, supplied);
  // @ts-expect-error Fixed App-root context cannot be replaced with a Page.
  AppBound.create(page, supplied);
  // @ts-expect-error Async factories are not Target inputs.
  DomPageObject.create(page, async () => supplied);
  // @ts-expect-error A factory must return a Locator, not selector text.
  DomPageObject.create(page, () => "button");
  // @ts-expect-error Page itself is not a Locator target.
  DomPageObject.create(page, page);
  // @ts-expect-error FrameLocator itself is not a Locator target.
  DomPageObject.create(page, page.frameLocator("iframe"));
  // @ts-expect-error Null is not an explicit target.
  DomPageObject.create(page, null);
  // @ts-expect-error Consumer construction remains protected.
  new DomPageObject(page, "button");
}
