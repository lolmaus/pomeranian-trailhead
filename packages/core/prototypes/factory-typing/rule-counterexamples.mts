// Review regressions: these pass TypeScript alone but MUST fail source enforcement.
import type { Page } from "@playwright/test";
import {
  Element,
  App,
  LibraryButton,
  rootFixture,
  checkLibrary,
  defaultInstanceType,
} from "./probe.mts";

class RequiresApp extends Element<App> {
  readonly Confirmation = this.root.ConfirmationDialog.locator;
}
const invalidRoot: Parameters<typeof rootFixture>[0] = RequiresApp;
export const invalidFixture = rootFixture(invalidRoot);

// The imported class name must not authorize a different, shadowing binding.
function makeFixture(App: Parameters<typeof rootFixture>[0]) {
  return rootFixture(App);
}
export const shadowedInvalidFixture = makeFixture(RequiresApp);

class WrongVector<Value = string> extends LibraryButton<null> {
  declare readonly [defaultInstanceType]: {
    instance: WrongVector;
    parameters: { [key: string]: unknown; root: null; value: Value };
  };
  value: Value | undefined = undefined;
}
checkLibrary<WrongVector>()(
  // @ts-ignore Deliberately reproduce the old inner-suppression loophole.
  WrongVector,
);

export function falselyNumeric(page: Page): number {
  const value = WrongVector.create(page);
  const wrongNumber: number = value.value;
  return wrongNumber;
}
