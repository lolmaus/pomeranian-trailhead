import { test, expect } from "@playwright/test";
import * as essential from "../src/index.js";

test("append preserves the existing value", async ({ page }) => {
  await page.setContent('<input value="Hello">');
  const text = essential.TextInput.create(page, "input");
  expect("appendText" in text).toBe(true);
  await (text as typeof text & { appendText(text: string): Promise<void> }).appendText(" world");
  await expect(text.locator).toHaveValue("Hello world");
});

test("append rejects structured values before mutation", async ({ page }) => {
  await page.setContent("<input type=number value=12>");
  const text = essential.TextInput.create(page, "input");
  await expect(text.appendText("3")).rejects.toThrow("appendText");
  await expect(text.locator).toHaveValue("12");
});

for (const type of ["text", "search", "email", "password", "tel", "url", "", "nonsense"]) {
  test(`append accepts resolved native ${type || "implicit"} text`, async ({ page }) => {
    await page.setContent(`<input type="${type}" value="old">`);
    const field = essential.TextInput.create(page, "input");
    await field.appendText("new", { timeout: 500 });
    await expect(field.locator).toHaveValue("oldnew");
  });
}

test("textarea appends after selection and preserves newlines and empty suffix", async ({
  page,
}) => {
  await page.setContent("<textarea>first</textarea>");
  const field = essential.TextArea.create(page, "textarea");
  await field.selectText();
  await field.appendText("\nsecond");
  await field.appendText("");
  await expect(field.locator).toHaveValue("first\nsecond");
  await field.clear();
  await field.appendText("start");
  await expect(field.locator).toHaveValue("start");
});

for (const target of [
  "<input type=date>",
  "<input type=checkbox>",
  "<select></select>",
  "<div contenteditable>old</div>",
  "<label for=x>Label</label><input id=x>",
  "<button>old</button>",
]) {
  test(`reject unsupported target ${target}`, async ({ page }) => {
    await page.setContent(target);
    const field = essential.TextInput.create(page, "body > :first-child");
    await expect(field.appendText("x")).rejects.toThrow("appendText");
  });
}

test("native targets remain live across type changes and replacements", async ({ page }) => {
  await page.setContent("<input id=x value=old>");
  const field = essential.TextInput.create(page, "#x");
  await field.appendText("1");
  await field.locator.evaluate((n) => ((n as HTMLInputElement).type = "number"));
  await expect(field.appendText("2")).rejects.toThrow("appendText");
  await field.locator.evaluate((n) => (n.outerHTML = "<textarea id=x>area</textarea>"));
  await field.appendText("2");
  await expect(field.locator).toHaveValue("area2");
});

for (const attribute of ["disabled", "readonly"]) {
  test(`native waiting for ${attribute} recovery mutates once`, async ({ page }) => {
    await page.setContent(
      `<input ${attribute} value=old oninput="this.dataset.events=String(Number(this.dataset.events||0)+1)">`,
    );
    const field = essential.TextInput.create(page, "input");
    let done = false;
    const action = field.appendText("new").then(() => {
      done = true;
    });
    let probes = 0;
    await expect
      .poll(() => {
        expect(done).toBe(false);
        return ++probes;
      })
      .toBeGreaterThanOrEqual(3);
    await field.locator.evaluate((n, attr) => n.removeAttribute(attr), attribute);
    await action;
    await expect(field.locator).toHaveValue("oldnew");
    await expect(field.locator).toHaveAttribute("data-events", "1");
  });
}

test("native bounded errors and missing-target waiting", async ({ page }) => {
  const field = essential.TextInput.create(page, "input");
  await expect(field.appendText("x", { timeout: 100 })).rejects.toThrow();
  const pending = field.appendText("late");
  await page.locator("body").evaluate((n) => (n.innerHTML = "<input value=old>"));
  await pending;
  await expect(field.locator).toHaveValue("oldlate");
  await field.locator.evaluate((n) => n.setAttribute("readonly", ""));
  await expect(field.appendText("x", { timeout: 100 })).rejects.toThrow();
  await field.locator.evaluate((n) => {
    n.removeAttribute("readonly");
    n.setAttribute("disabled", "");
  });
  await expect(field.appendText("x", { timeout: 100 })).rejects.toThrow();
  await page.setContent("<input><input>");
  await expect(field.appendText("x", { timeout: 100 })).rejects.toThrow("strict mode");
});

test("append retains native sanitization, maxlength and force behavior without keyboard events", async ({
  page,
}) => {
  await page.setContent(
    "<input id=append maxlength=4 value=ab><input id=native maxlength=4 value=ab>",
  );
  await page.evaluate(() => {
    (window as unknown as { keys: number }).keys = 0;
    document.addEventListener("keydown", () => {
      (window as unknown as { keys: number }).keys++;
    });
  });
  const append = essential.TextInput.create(page, "#append");
  await append.selectText();
  await append.appendText("cdef\ng", { force: true, timeout: 500 });
  await page.locator("#native").fill("abcdef\ng", { force: true, timeout: 500 });
  expect(await append.locator.inputValue()).toBe(await page.locator("#native").inputValue());
  expect(await page.evaluate(() => (window as unknown as { keys: number }).keys)).toBe(0);
});

test("independent EditableText composition inherits fill/clear and sibling controls stay separate", async ({
  page,
}) => {
  const { DomPageObject } = await import("@pomeranian/core");
  class Custom extends DomPageObject.with(essential.EditableText) {}
  class ValueOnly extends DomPageObject.with(essential.EditableValue) {}
  class Search extends essential.TextInput {
    override defaultTarget = "input";
  }
  await page.setContent("<input>");
  const custom = Custom.create(page, "input");
  await custom.fill("a");
  await custom.appendText("b");
  await expect(custom.locator).toHaveValue("ab");
  await custom.clear();
  await Search.create(page).appendText("subclass");
  await expect(custom.locator).toHaveValue("subclass");
  expect(essential.TextArea.prototype instanceof essential.TextInput).toBe(false);
  expect("appendText" in ValueOnly.create(page, "input")).toBe(false);
  expect("appendText" in essential.Element.create(page, "input")).toBe(false);
  expect("appendText" in essential.ContentEditable.create(page, "input")).toBe(false);
});
