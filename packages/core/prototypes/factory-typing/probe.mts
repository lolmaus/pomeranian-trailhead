// THROWAWAY #9: candidate factory contract, not production core code.
// See counterexamples.mts and README.md before relying on this mechanism.
import type { Page, Locator } from "@playwright/test";

export interface RootReference {
  readonly page: Page;
  readonly root: RootReference | null;
}
export type UnboundRoot = RootReference | null;
export const defaultInstanceType: unique symbol = Symbol("default instance type");
type Class = Function & { prototype: PageObject<UnboundRoot> };
type Default<I extends PageObject<UnboundRoot>> = I[typeof defaultInstanceType]["instance"];
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Erased<Args extends object> = true extends { [K in keyof Args]: IsAny<Args[K]> }[keyof Args]
  ? true
  : false;

export type Result<C extends Class> =
  Erased<C["prototype"][typeof defaultInstanceType]["parameters"]> extends true
    ? Default<C["prototype"]> extends C["prototype"]
      ? Default<C["prototype"]>
      : never
    : C["prototype"];
type IsAny<T> = 0 extends 1 & T ? true : false;
type Context<Root extends UnboundRoot> =
  IsAny<Root> extends true ? never : null extends Root ? Page | PageObject<Root> : PageObject<Root>;
type TargetArguments<Instance> =
  Instance extends DomPageObject<UnboundRoot>
    ? Instance extends { defaultTarget: string }
      ? [target?: string]
      : [target: string]
    : [];

export class PageObject<Root extends UnboundRoot = UnboundRoot> {
  declare readonly [defaultInstanceType]: { instance: PageObject; parameters: { root: Root } };
  readonly #parent: PageObject<Root> | null;
  readonly #page: Page;
  readonly #root: Root;

  protected constructor(context: Page | PageObject<Root>, _target?: string, asRoot = false) {
    this.#parent = context instanceof PageObject ? context : null;
    this.#page = this.#parent ? this.#parent.page : (context as Page);
    this.#root = (asRoot ? this : this.#parent ? this.#parent.root : null) as Root;
  }

  get page(): Page {
    return this.#page;
  }
  get root(): Root {
    return this.#root;
  }
  get scope(): Page | Locator {
    return this.#parent ? this.#parent.scope : this.#page;
  }

  static create<C extends Class>(
    this: C,
    context: Context<Result<C>["root"]>,
    ...[target]: TargetArguments<Result<C>>
  ): Result<C> {
    const object = Reflect.construct(this, [context, target, false]) as PageObject<UnboundRoot>;
    if (object instanceof DomPageObject) object.validateOwnTarget();
    return object as Result<C>;
  }
}

export class DomPageObject<Root extends UnboundRoot = UnboundRoot> extends PageObject<Root> {
  declare readonly [defaultInstanceType]: { instance: DomPageObject; parameters: { root: Root } };
  defaultTarget: string | undefined = undefined;
  readonly #explicitTarget: string | undefined;
  readonly #rootFallback: string | undefined;

  protected constructor(context: Page | PageObject<Root>, target?: string, asRoot = false) {
    super(context, target, asRoot);
    this.#explicitTarget = target;
    this.#rootFallback = asRoot ? "html" : undefined;
  }

  get effectiveTarget(): string {
    const target = this.#explicitTarget ?? this.defaultTarget ?? this.#rootFallback;
    if (!target?.trim()) throw new Error("A DOM target is required.");
    return target;
  }

  validateOwnTarget(): void {
    void this.effectiveTarget;
  }
  get locator(): Locator {
    return super.scope.locator(this.effectiveTarget);
  }
  override get scope(): Locator {
    return this.locator;
  }
}

export class Element<Root extends UnboundRoot = UnboundRoot> extends DomPageObject<Root> {
  declare readonly [defaultInstanceType]: { instance: Element; parameters: { root: Root } };
}

export function rootFixture<C extends Class>(
  Class: C & (Result<C> extends Result<C>["root"] ? unknown : never),
  ...[target]: Result<C> extends DomPageObject<UnboundRoot> ? [target?: string] : []
) {
  return async ({ page }: { page: Page }, use: (app: Result<C>) => Promise<void>) => {
    const app = Reflect.construct(Class, [page, target, true]) as PageObject<UnboundRoot>;
    if (app instanceof DomPageObject) app.validateOwnTarget();
    await use(app as Result<C>);
  };
}

export class Item extends Element<App> {}
export class Menu extends Element<App> {
  LibraryButton = LibraryButton.create(this);
  Approval = AppButton.create(this);
  Item = Item.create(this, ".item");
  override defaultTarget = ".menu";
}
export class Settings extends PageObject<App> {
  Menu = Menu.create(this);
}
export class App extends Element<App> {
  Settings = Settings.create(this);
  ConfirmationDialog = ConfirmationDialog.create(this);
  override defaultTarget = "#app";
}

export class PlainItem extends Element<null> {}
export class Toolbar extends Element<null> {
  Item = PlainItem.create(this, ".item");
  override defaultTarget = ".toolbar";
}
export class CompactToolbar extends Toolbar {
  override defaultTarget = ".compact";
}

export function compileTimeExamples(page: Page, app: App) {
  const menu: Menu = Menu.create(app);
  const explicit: Menu = Menu.create(app, ".other-menu");
  const item: Item = Item.create(app, ".item");
  const toolbar: Toolbar = Toolbar.create(page);
  const compact: CompactToolbar = CompactToolbar.create(page);
  const group: Settings = Settings.create(app);
  void [menu, explicit, item, toolbar, compact, group];
  // @ts-expect-error No instance default: an explicit target is required.
  Item.create(app);
  // @ts-expect-error Fixed App root does not accept rootless Page context.
  Menu.create(page);
  // @ts-expect-error Grouping factory has no target argument.
  Settings.create(app, ".unneeded");
  // @ts-expect-error Target must be a string in this deliberately narrow probe.
  Menu.create(app, 123);
}

export class ConfirmationDialog extends Element<App> {
  override defaultTarget = ".confirmation";
  async confirm(): Promise<void> {
    await this.locator.getByTestId("confirm").click();
  }
}

// A library implementation supplies one type-only declaration; it does not
// override create, alter constructors, or make runtime root assumptions.
export class LibraryButton<Root extends UnboundRoot = UnboundRoot> extends Element<Root> {
  declare readonly [defaultInstanceType]: { instance: LibraryButton; parameters: { root: Root } };
  override defaultTarget = "button.library";
  async click(): Promise<void> {
    await this.locator.click();
  }
  getRoot(): Root {
    return this.root;
  }
  libraryOnly(): string {
    return "library API";
  }
}

export class AppButton extends LibraryButton<App> {
  async approve(): Promise<void> {
    await this.root.ConfirmationDialog.confirm();
  }
}
export class StandaloneButton extends LibraryButton<null> {}
export class FlexibleButton extends LibraryButton<App | null> {
  async approveIfRooted(): Promise<void> {
    if (this.root !== null) await this.root.ConfirmationDialog.confirm();
  }
}

type Check<T extends true> = T;
export function libraryTypeExamples(page: Page, app: App) {
  const direct = LibraryButton.create(app);
  const adHoc = LibraryButton.create(page);
  const bound = AppButton.create(app);
  const standalone = StandaloneButton.create(page);
  const flexible = FlexibleButton.create(page);
  const rootedFlexible = FlexibleButton.create(app);
  type DirectExact = Check<Equal<typeof direct, LibraryButton<UnboundRoot>>>;
  type BoundExact = Check<Equal<typeof bound, AppButton>>;
  type DirectRoot = Check<Equal<ReturnType<typeof direct.getRoot>, UnboundRoot>>;
  type BoundRoot = Check<Equal<ReturnType<typeof bound.getRoot>, App>>;
  type StandaloneRoot = Check<Equal<ReturnType<typeof standalone.getRoot>, null>>;
  type FlexibleRoot = Check<Equal<ReturnType<typeof flexible.getRoot>, App | null>>;
  type NoAny = Check<Equal<IsAny<ReturnType<typeof direct.getRoot>>, false>>;
  const directInstance: LibraryButton<UnboundRoot> = direct;
  const directRoot: UnboundRoot = direct.getRoot();
  const appRoot: App = bound.getRoot();
  void [directInstance, directRoot, appRoot, adHoc, rootedFlexible];
  void direct.libraryOnly();
  void bound.libraryOnly();
  void bound.approve();
  void flexible.approveIfRooted();
  // @ts-expect-error A neutral library root does not expose the App API.
  direct.root.ConfirmationDialog;
  // @ts-expect-error Root-dependent return type also stays neutral, not any.
  direct.getRoot().nonexistentMember;
  // @ts-expect-error Bound App API has no nonexistent member.
  bound.getRoot().nonexistentMember;
  // @ts-expect-error Fixed App root cannot be omitted.
  AppButton.create(page);
  // @ts-expect-error Construction is protected.
  new LibraryButton(page);
  // @ts-expect-error Bound Menu cannot be designated as an incompatible App root.
  rootFixture(Menu);
  void rootFixture(App);
}

// CANDIDATE LIBRARY-AUTHOR CHECK, required once per generic declaration.
// This verifies result/default conformance. Constructor compatibility is coarse:
// TypeScript constructor bivariance leaves the counterexamples below unchecked.
// Expected is the bare instance type, so TypeScript applies its declared defaults.
export function checkLibrary<Expected extends PageObject<UnboundRoot>>() {
  return <C extends Class>(
    Class: C &
      (Equal<Result<C>, Expected> extends true ? unknown : never) &
      (C extends typeof PageObject<Expected["root"]> ? unknown : never),
  ): C => Class;
}
