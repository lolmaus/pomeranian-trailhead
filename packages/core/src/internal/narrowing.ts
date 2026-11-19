import type { Locator } from "playwright-core";
type Options = NonNullable<Parameters<Locator["filter"]>[0]>;
export function captureFilter(input: Options | undefined) {
  if (input === undefined) return { options: undefined, description: undefined };
  const options: Options = {};
  const description: Record<string, unknown> = {};
  for (const key of ["has", "hasNot", "hasText", "hasNotText", "visible"] as const) {
    const value = input[key];
    if (value === undefined) continue;
    const captured = value instanceof RegExp ? new RegExp(value.source, value.flags) : value;
    Object.defineProperty(options, key, { value: captured, enumerable: true });
    description[key] =
      captured instanceof RegExp
        ? Object.freeze({ source: captured.source, flags: captured.flags })
        : captured;
  }
  return { options: Object.freeze(options), description: Object.freeze(description) };
}
