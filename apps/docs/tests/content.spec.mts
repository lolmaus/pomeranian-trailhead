import { expect, test } from "@playwright/test";
import { content } from "../lib/content.mts";

test("shared content preserves headings, tables and literal code", () => {
  const source =
    "# Examples\n\n| Name | Meaning |\n| --- | --- |\n| one | preserved |\n\n```html\n<Widget>[literal](missing.md)</Widget>\n```\n";
  const result = content(source);
  expect(result.markdown).toBe(source);
  expect(result.headings).toEqual(["Examples"]);
});

test("includes exact named regions from checked examples", () => {
  const sources = {
    "examples/demo.mts":
      "outside\n// #region shown\nconst answer = 42;\n// #endregion shown\noutside\n",
  };
  expect(content("# Guide\n\n<!-- @example examples/demo.mts#shown -->\n", sources).markdown).toBe(
    "# Guide\n\n```ts\nconst answer = 42;\n```\n",
  );
});

test("rejects meaningful web-only content rather than losing it", () => {
  expect(() => content('# Guide\n\n<Widget important="meaning" />\n')).toThrow("Unsupported HTML");
});

test("rejects unresolved or ambiguous checked regions and web-only enhancements", () => {
  const directive = "<!-- @example examples/demo.mts#shown -->\n";
  expect(() => content(directive)).toThrow("Unknown checked example");
  for (const source of [
    "// #region shown\nmissing end\n",
    "// #region shown\na\n// #endregion shown\n// #region shown\nb\n// #endregion shown\n",
  ]) {
    expect(() => content(directive, { "examples/demo.mts": source })).toThrow(
      "Missing, duplicate or unclosed example region",
    );
  }
  for (const source of [
    "---\ntitle: lost meaning\n---\n",
    "{{ dynamicMeaning }}\n",
    "![meaningful diagram](image.svg)\n",
  ])
    expect(() => content(source)).toThrow();
  const code = "```html\n<!-- @example examples/not-checked.mts#missing -->\n{{ literal }}\n```\n";
  expect(content(code).markdown).toBe(code);
  expect(content("[real](guide.md) and `[literal](missing.md)`\n").links).toEqual(["guide.md"]);
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
