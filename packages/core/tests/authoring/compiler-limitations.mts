// Reusable unchecked-source fixtures for optional checker #25. These forms
// compile but violate supported source conventions. Never execute them or claim
// TypeScript alone rejects them. The optional checker is not implemented here.
import type { Page } from "playwright-core";
import {
  DomPageObject,
  PageObject,
  type Constructor,
  type UnboundRoot,
  defaultInstanceType,
} from "../../src/index.js";
export class NarrowConstructor extends DomPageObject {
  protected constructor(page: Page, target: string) {
    super(page, target);
  }
}
export class MissingMetadata<R extends UnboundRoot = UnboundRoot> extends DomPageObject<R> {}
export class IncompleteMetadata<
  R extends UnboundRoot = UnboundRoot,
  Value = string,
> extends DomPageObject<R> {
  declare readonly [defaultInstanceType]: { instance: IncompleteMetadata; parameters: { root: R } };
  value: Value | undefined = undefined;
}
export const Alias = NarrowConstructor;
export class Suppressed extends DomPageObject {
  // @ts-ignore Deliberate source suppression fixture for checker #25.
  override defaultTarget = 123;
}

function Tagged<T extends Constructor>(Base: T) {
  return class extends Base {
    tag() {
      return "tagged";
    }
  };
}
export function unsupportedConstruction(page: Page) {
  // Technically public constructors do not finalize objects. This compiles but
  // is unsupported; only named create/rootFixture are supported construction.
  const direct = new DomPageObject(page, "button");
  // Computed factory receivers are unsupported even when compilation succeeds.
  const computed = PageObject.with(Tagged).create(page);
  return [direct, computed];
}
export class ReplacedProtocol extends PageObject {
  static override create = PageObject.create;
  static override with = PageObject.with;
}
