// Reusable unchecked-source fixtures for optional checker #25. These forms
// compile but violate supported source conventions. Never execute them or claim
// TypeScript alone rejects them. The optional checker is not implemented here.
import type { Page } from "playwright-core";
import { DomPageObject, type UnboundRoot, defaultInstanceType } from "../../src/index.js";
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
