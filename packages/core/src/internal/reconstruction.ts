import type { Locator } from "playwright-core";
import type { DomPageObject } from "../dom-page-object.js";
import { state, finish } from "./state.js";
export interface Derivation {
  readonly source: DomPageObject;
  readonly operation: Readonly<{ kind: string; arguments?: readonly unknown[] }>;
}
export const derivations = new WeakMap<DomPageObject, Derivation>();
export function reconstruct<T extends DomPageObject>(
  source: T,
  transform: (locator: Locator) => Locator,
  operation: Derivation["operation"] = { kind: "internal" },
): T {
  const original = state(source);
  if (!original.complete) throw new Error("Reconstruction during page-object initialization.");
  const target = () => transform(source.locator);
  const object = Reflect.construct(original.concrete, [
    original.parent ?? original.page,
    target,
    original.asRoot,
  ]) as T;
  finish(object);
  derivations.set(
    object,
    Object.freeze({
      source,
      operation: Object.freeze({
        ...operation,
        ...(operation.arguments ? { arguments: Object.freeze([...operation.arguments]) } : {}),
      }),
    }),
  );
  return object;
}
