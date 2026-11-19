import { test, expect } from "@playwright/test";
import {
  Element,
  TextInput,
  TextArea,
  Checkbox,
  Radio,
  Select,
  ContentEditable,
  CheckableUncheckable,
} from "../src/index.js";
class BroadCheckable extends Element.with(CheckableUncheckable) {}
import type { Locator } from "playwright-core";

test("fill preserves native form behavior", async ({ page }) => {
  await page.setContent('<input value="old">');
  const control = TextInput.create(page, "input, select");
  expect(typeof (control as unknown as Record<string, unknown>)["fill"]).toBe("function");
  await (control as unknown as { fill: Locator["fill"] }).fill("new");
  await expect(page.locator("input")).toHaveValue("new");
});

test("clear preserves native form behavior", async ({ page }) => {
  await page.setContent('<input value="old">');
  const control = TextInput.create(page, "input, select");
  expect(typeof (control as unknown as Record<string, unknown>)["clear"]).toBe("function");
  await (control as unknown as { clear: Locator["clear"] }).clear();
  await expect(page.locator("input")).toHaveValue("");
});

test("check preserves native form behavior", async ({ page }) => {
  await page.setContent('<input type="checkbox">');
  const control = Checkbox.create(page, "input, select");
  expect(typeof (control as unknown as Record<string, unknown>)["check"]).toBe("function");
  await (control as unknown as { check: Locator["check"] }).check();
  await expect(page.locator("input")).toBeChecked();
});

test("uncheck preserves native form behavior", async ({ page }) => {
  await page.setContent('<input type="checkbox" checked>');
  const control = Checkbox.create(page, "input, select");
  expect(typeof (control as unknown as Record<string, unknown>)["uncheck"]).toBe("function");
  await (control as unknown as { uncheck: Locator["uncheck"] }).uncheck();
  await expect(page.locator("input")).not.toBeChecked();
});

test("setChecked preserves native form behavior", async ({ page }) => {
  await page.setContent('<input type="checkbox">');
  const control = Checkbox.create(page, "input, select");
  expect(typeof (control as unknown as Record<string, unknown>)["setChecked"]).toBe("function");
  await (control as unknown as { setChecked: Locator["setChecked"] }).setChecked(true);
  await expect(page.locator("input")).toBeChecked();
});

test("selectOption preserves native form behavior", async ({ page }) => {
  await page.setContent(
    '<select><option value="a">A</option><option value="b">B</option></select>',
  );
  const control = Select.create(page, "input, select");
  expect(typeof (control as unknown as Record<string, unknown>)["selectOption"]).toBe("function");
  await (control as unknown as { selectOption: Locator["selectOption"] }).selectOption("b");
  await expect(page.locator("select")).toHaveValue("b");
});

test("selectText preserves native form behavior", async ({ page }) => {
  await page.setContent('<input value="hello">');
  const control = Element.create(page, "input, select");
  expect(typeof (control as unknown as Record<string, unknown>)["selectText"]).toBe("function");
  await (control as unknown as { selectText: Locator["selectText"] }).selectText();
  expect(
    await page.locator("input").evaluate((node) => {
      const input = node as HTMLInputElement;
      return [input.selectionStart, input.selectionEnd];
    }),
  ).toEqual([0, 5]);
});

test("fill and clear retain native editable applicability and events", async ({ page }) => {
  await page.setContent(
    '<textarea>old</textarea><div contenteditable>old</div><input type=date><input id=text oninput="this.dataset.input=this.value" onchange="this.dataset.change=this.value">',
  );
  for (const target of ["textarea", "[contenteditable]", "#text"]) {
    const Control =
      target === "textarea"
        ? TextArea
        : target === "[contenteditable]"
          ? ContentEditable
          : TextInput;
    const field = Control.create(page, target);
    await field.fill("new");
    if (target === "[contenteditable]") await expect(page.locator(target)).toHaveText("new");
    else await expect(page.locator(target)).toHaveValue("new");
    await field.clear();
    if (target === "[contenteditable]") await expect(page.locator(target)).toHaveText("");
    else await expect(page.locator(target)).toHaveValue("");
  }
  await TextInput.create(page, "input[type=date]").fill("2026-11-13");
  await expect(page.locator("input[type=date]")).toHaveValue("2026-11-13");
  await expect(page.locator("#text")).toHaveAttribute("data-input", "");
  await TextInput.create(page, "#text").fill("committed");
  await Element.create(page, "#text").blur();
  await expect(page.locator("#text")).toHaveAttribute("data-change", "committed");
});
test("checkable actions retain trial, idempotence, labels and radio errors", async ({ page }) => {
  await page.setContent(
    "<label for=c>Agree</label><input id=c type=checkbox><input id=a type=radio name=g><input id=b type=radio name=g>",
  );
  const c = Checkbox.create(page, "#c");
  await c.check({ trial: true });
  await expect(page.locator("#c")).not.toBeChecked();
  await Checkbox.create(page, "label").check();
  await c.check();
  await c.setChecked(true);
  await expect(page.locator("#c")).toBeChecked();
  await c.uncheck();
  await c.uncheck();
  await c.setChecked(false);
  await expect(page.locator("#c")).not.toBeChecked();
  await Radio.create(page, "#a").check();
  await BroadCheckable.create(page, "#b").setChecked(true);
  await expect(page.locator("#a")).not.toBeChecked();
  await expect(page.locator("#b")).toBeChecked();
  await expect(BroadCheckable.create(page, "#b").uncheck({ timeout: 200 })).rejects.toThrow(
    "radio",
  );
});
test("selection retains native choices, labels and selected results", async ({ page }) => {
  await page.setContent(
    "<label for=s>Choice</label><select id=s multiple><option value=a>A</option><option value=b>B</option></select>",
  );
  const select = Select.create(page, "#s");
  expect(await select.selectOption(["a", "b"] as const)).toEqual(["a", "b"]);
  await expect(page.locator("#s")).toHaveValues(["a", "b"]);
  expect(await Select.create(page, "label").selectOption({ label: "B" })).toEqual(["b"]);
  expect(await select.selectOption({ index: 0 })).toEqual(["a"]);
  const handle = await page.locator("option[value=b]").elementHandle();
  expect(await select.selectOption(handle!)).toEqual(["b"]);
  expect(await select.selectOption(null)).toEqual([]);
});
test("selectText selects complete input, textarea and element text", async ({ page }) => {
  await page.setContent(
    "<input id=input value=Hello><textarea id=area>World</textarea><input id=untouched value=Other><p>Native text</p>",
  );
  for (const tag of ["#input", "#area"]) {
    const field = Element.create(page, tag);
    await field.selectText();
    expect(
      await page.locator(tag).evaluate((node) => {
        const input = node as HTMLInputElement;
        return [input.selectionStart, input.selectionEnd];
      }),
    ).toEqual([0, 5]);
  }
  expect(
    await page.locator("#untouched").evaluate((node) => {
      const input = node as HTMLInputElement;
      return [input.value, input.selectionStart, input.selectionEnd];
    }),
  ).toEqual(["Other", 0, 0]);
  await Element.create(page, "p").selectText();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("Native text");
});
test("native waits resume when editable state and options become ready", async ({ page }) => {
  await page.setContent("<input readonly><select></select>");
  let settled = false;
  const fill = TextInput.create(page, "input")
    .fill("ready")
    .then(() => {
      settled = true;
    });
  let probes = 0;
  await expect
    .poll(() => {
      expect(settled).toBe(false);
      return ++probes;
    })
    .toBeGreaterThanOrEqual(3);
  await page.locator("input").evaluate((node) => node.removeAttribute("readonly"));
  await fill;
  await expect(page.locator("input")).toHaveValue("ready");
  const selection = Select.create(page, "select").selectOption("late");
  await page.locator("select").evaluate((node) => node.append(new Option("Late", "late")));
  expect(await selection).toEqual(["late"]);
});
test("native applicability, cardinality, disabled and missing failures remain visible", async ({
  page,
}) => {
  await page.setContent(
    "<input disabled><textarea readonly></textarea><div>Wrong</div><button>A</button><button>B</button>",
  );
  await expect(TextInput.create(page, "input").fill("x", { timeout: 150 })).rejects.toThrow(
    "Timeout",
  );
  await expect(TextInput.create(page, "textarea").clear({ timeout: 150 })).rejects.toThrow(
    "Timeout",
  );
  await expect(TextInput.create(page, "div").fill("x", { timeout: 150 })).rejects.toThrow("not an");
  await expect(Checkbox.create(page, "div").check({ timeout: 150 })).rejects.toThrow("checkbox");
  await expect(Select.create(page, "div").selectOption("x", { timeout: 150 })).rejects.toThrow(
    "select",
  );
  await expect(Element.create(page, "button").selectText({ timeout: 150 })).rejects.toThrow(
    "strict mode",
  );
  await expect(Element.create(page, "#missing").selectText({ timeout: 150 })).rejects.toThrow(
    "Timeout",
  );
});

test("force selectOption retains native visibility override", async ({ page }) => {
  await page.setContent(
    "<select hidden><option value=a>A</option><option value=b>B</option></select>",
  );
  expect(await Select.create(page, "select").selectOption("b", { force: true })).toEqual(["b"]);
  await expect(page.locator("select")).toHaveValue("b");
});
