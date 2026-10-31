import { expect, test } from "@playwright/test";
import { content } from "../lib/content.mts";

test("shared content preserves headings, tables and literal code", () => {
  const source =
    "# Examples\n\n| Name | Meaning |\n| --- | --- |\n| one | preserved |\n\n```html\n<Widget>[literal](missing.md)</Widget>\n```\n";
  const result = content(source);
  expect(result.markdown).toBe(source);
  expect(result.headings).toEqual(["Examples"]);
});
