// Deliberately unsafe constructors, used only to demonstrate unchecked cases.
import type { Page } from "@playwright/test";
import {
  LibraryButton,
  Element,
  PageObject,
  checkLibrary,
  defaultInstanceType,
  App,
  type UnboundRoot,
} from "./probe.mts";
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Check<T extends true> = T;
export class PageOnly extends LibraryButton<null> {
  protected constructor(context: Page, target?: string, asRoot = false) {
    if (context instanceof PageObject) throw Error("Page context required");
    super(context, target, asRoot);
  }
}
checkLibrary<PageOnly>()(PageOnly);
export class LiteralTarget extends LibraryButton<null> {
  protected constructor(
    context: Page | PageObject<null>,
    target: "button.library" = "button.library",
    asRoot = false,
  ) {
    if (target !== "button.library") throw Error("Specific target required");
    super(context, target, asRoot);
  }
}
checkLibrary<LiteralTarget>()(LiteralTarget);
export class NeverRoot extends LibraryButton<UnboundRoot> {
  protected constructor(
    context: Page | PageObject<UnboundRoot>,
    target?: string,
    asRoot: false = false,
  ) {
    if (asRoot) throw Error("Root mode unsupported");
    super(context, target, asRoot);
  }
}
checkLibrary<NeverRoot>()(NeverRoot);
export class RequiredTarget extends LibraryButton<null> {
  protected constructor(context: Page | PageObject<null>, target: string) {
    if (target === undefined) throw Error("Explicit target required");
    super(context, target);
  }
}
checkLibrary<RequiredTarget>()(RequiredTarget);
class ExtraRequired extends LibraryButton<null> {
  protected constructor(
    context: Page | PageObject<null>,
    target: string | undefined,
    asRoot: boolean,
    state: number,
  ) {
    super(context, target, asRoot);
    if (state === undefined) throw Error("State required");
  }
}
// @ts-expect-error Fourth required constructor arg cannot be supplied.
checkLibrary<ExtraRequired>()(ExtraRequired);
class OptionalState extends LibraryButton<null> {
  protected constructor(
    context: Page | PageObject<null>,
    target?: string,
    asRoot = false,
    state = 42,
  ) {
    super(context, target, asRoot);
    void state;
  }
}
checkLibrary<OptionalState>()(OptionalState);
class Value<T = string> extends LibraryButton<null> {
  declare readonly [defaultInstanceType]: { instance: Value; parameters: { root: null; value: T } };
  #value!: T;
  value(): T {
    return this.#value;
  }
}
class NumberDefault<T = number> extends Value<T> {}
// @ts-expect-error Changed independent default not reflected in instance metadata.
checkLibrary<NumberDefault>()(NumberDefault);
class AppValue extends Value<number> {}
checkLibrary<AppValue>()(AppValue);
export function calls(page: Page, parent: PageObject<null>) {
  const wrongContext = PageOnly.create(parent);
  const wrongTarget = LiteralTarget.create(page, "#anything");
  const missingTarget = RequiredTarget.create(page);

  void [wrongContext, wrongTarget, missingTarget];
}
