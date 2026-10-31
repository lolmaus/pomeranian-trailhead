import { expect, test } from "@playwright/test";
import { content } from "../lib/content.mts";

test("shared content preserves headings, tables and literal code", () => {
  const source =
    "# Examples\n\n| Name | Meaning |\n| --- | --- |\n| one | preserved |\n\n```html\n<Widget>[literal](missing.md)</Widget>\n```\n";
  const result = content(source);
  expect(result.markdown).toBe(source);
  expect(result.headings).toEqual(["Examples"]);
});

test("rejects meaningful web-only content rather than losing it", () => {
  expect(() => content('# Guide\n\n<Widget important="meaning" />\n')).toThrow("Unsupported HTML");
});

test("normalizes labelled callouts without interpreting fenced examples", () => {
  const result = content(
    "::: warning Compatibility\nKeep the limitation.\n\n```md\n::: imaginary\n```\n:::\n",
  );
  expect(result.markdown).toContain("> **Warning: Compatibility**");
  expect(result.markdown).toContain("> Keep the limitation.");
  expect(result.markdown).toContain("> ::: imaginary");
  expect(() => content("::: imaginary\nLost meaning\n:::\n")).toThrow("Unsupported container");
  expect(() => content("::: note\nMissing end\n")).toThrow("Unclosed container");
});
