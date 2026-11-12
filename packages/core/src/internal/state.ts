import type { Locator, Page } from "playwright-core";
import type { PageObject } from "../page-object.js";
import type { Target } from "../target.js";
export interface State {
  page: Page;
  parent: PageObject | null;
  root: import("../authoring.js").UnboundRoot;
  concrete: Function;
  asRoot: boolean;
  complete: boolean;
  finalize?: () => void;
  scope?: () => Locator;
  explicit: Target | undefined;
}
export const states = new WeakMap<PageObject, State>();
export function state(object: PageObject): State {
  const result = states.get(object);
  if (!result) throw new Error("Unknown page object");
  return result;
}
export function finish(object: PageObject): void {
  const value = state(object);
  if (value.finalize) value.finalize();
  else if (value.explicit !== undefined)
    throw new Error("Grouping page objects do not accept targets.");
  value.complete = true;
}
export function assertReady(object: PageObject): void {
  const value = state(object);
  if (!value.complete) throw new Error("Locator access during page-object initialization.");
  if (value.parent) assertReady(value.parent);
}
export function inheritedScope(object: PageObject): Locator | null {
  const parent = state(object).parent;
  return parent ? effectiveScope(parent) : null;
}
export function effectiveScope(object: PageObject): Locator | null {
  return state(object).scope?.() ?? inheritedScope(object);
}
