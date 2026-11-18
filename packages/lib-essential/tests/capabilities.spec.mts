import { test, expect } from "@playwright/test";
import * as essential from "../src/index.js";
import { DomPageObject } from "@pomeranian/core";

test("factories work independently on custom DOM bases", async ({ page }) => {
  class Component extends DomPageObject {
    component = true;
  }
  class Filled extends Component.with(essential.Fillable) {}
  class Edited extends Component.with(essential.EditableValue) {}
  class Checked extends Component.with(essential.Checkable) {}
  class Unchecked extends Component.with(essential.CheckableUncheckable) {}
  class Selected extends Component.with(essential.SelectableOptions) {}
  await page.setContent(
    "<input id=t value=old><input id=c type=checkbox><select><option value=a>A</option></select>",
  );
  await Filled.create(page, "#t").fill("new");
  await expect(page.locator("#t")).toHaveValue("new");
  await Edited.create(page, "#t").clear();
  await expect(page.locator("#t")).toHaveValue("");
  await Checked.create(page, "#c").check();
  await expect(page.locator("#c")).toBeChecked();
  await Unchecked.create(page, "#c").uncheck();
  await expect(page.locator("#c")).not.toBeChecked();
  await Unchecked.create(page, "#c").setChecked(true);
  await expect(page.locator("#c")).toBeChecked();
  expect(await Selected.create(page, "select").selectOption("a")).toEqual(["a"]);
});

test("foundational controls are public", () => {
  for (const name of ["TextInput", "TextArea", "Checkbox", "Radio", "Select", "ContentEditable"])
    expect(typeof (essential as unknown as Record<string, unknown>)[name]).toBe("function");
});
test("Element has no control mutation methods", async ({ page }) => {
  const element = essential.Element.create(page, "input");
  for (const name of ["fill", "clear", "check", "uncheck", "setChecked", "selectOption"])
    expect(name in element).toBe(false);
});

test("controls preserve intent surfaces and live native targets", async ({ page }) => {
  const { TextInput, TextArea, Checkbox, Radio, Select, ContentEditable } = essential;
  const text = TextInput.create(page, "#t");
  await page.setContent(
    "<input id=t disabled><textarea></textarea><div contenteditable></div><input type=checkbox><input type=radio><select><option>A</option></select>",
  );
  const fill = text.fill("ready");
  await page.locator("#t").evaluate((n) => n.removeAttribute("disabled"));
  await fill;
  await expect(text.locator).toHaveValue("ready");
  await page.locator("#t").evaluate((n) => (n.outerHTML = "<textarea id=t>replacement</textarea>"));
  await text.fill("live");
  await expect(text.locator).toHaveValue("live");
  await TextArea.create(page, "textarea:not(#t)").fill("area");
  await ContentEditable.create(page, "[contenteditable]").fill("editable");
  await Checkbox.create(page, "[type=checkbox]").check();
  await Radio.create(page, "[type=radio]").check();
  expect(await Select.create(page, "select").selectOption({ index: 0 })).toEqual(["A"]);
  expect("uncheck" in Radio.create(page, "[type=radio]")).toBe(false);
  expect("setChecked" in Radio.create(page, "[type=radio]")).toBe(false);
  expect("appendText" in ContentEditable.create(page, "[contenteditable]")).toBe(false);
  expect(TextArea.prototype instanceof TextInput).toBe(false);
  const missing = TextInput.create(page, "#later");
  const pending = missing.fill("late");
  await page.locator("body").evaluate((n) => n.insertAdjacentHTML("beforeend", "<input id=later>"));
  await pending;
  await expect(missing.locator).toHaveValue("late");
  await page.locator("#later").evaluate((n) => ((n as HTMLInputElement).type = "checkbox"));
  await expect(missing.fill("wrong", { timeout: 150 })).rejects.toThrow();
});

test("control root fixtures initialize capability children and retain native label retargeting", async ({
  page,
}) => {
  const { rootFixture } = await import("@pomeranian/core");
  class App extends essential.TextInput<App> {
    override defaultTarget = "#text";
    Agree = essential.Checkbox.create(this.root, ({ page }) => page.locator("#check"));
  }
  await page.setContent(
    "<label for=text>Name</label><input id=text><input id=check type=checkbox>",
  );
  await rootFixture(App)({ page }, async (app) => {
    expect(app.root).toBe(app);
    expect(app.Agree.root).toBe(app);
    await app.fill("root");
    await expect(app.locator).toHaveValue("root");
    await app.Agree.check();
    await expect(app.Agree.locator).toBeChecked();
  });
  const label = essential.TextInput.create(page, "label");
  const query = label.locator;
  await label.fill("retargeted");
  await expect(page.locator("#text")).toHaveValue("retargeted");
  await expect(label.locator).toHaveJSProperty("tagName", "LABEL");
  expect(label.locator).toBe(query);
});
