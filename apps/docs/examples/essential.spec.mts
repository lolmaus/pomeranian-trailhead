import { test, expect } from "@playwright/test";
// #region essential
import { DomPageObject, PageObject, rootFixture } from "@pomeranian/core";
import { Element, TextInput, TextArea, Checkbox, Select } from "@pomeranian/lib-essential";
class Menu extends PageObject<App> {
  Continue = Element.create(this, "button");
}
class App extends DomPageObject<App> {
  override defaultTarget = "main";
  Menu = Menu.create(this);
}
const appTest = test.extend<{ app: App }>({ app: rootFixture(App) });
appTest("essential actions use the application scope", async ({ page, app }) => {
  await page.setContent(
    "<button id=decoy onclick=\"this.textContent='Done'\">Decoy</button><main><button id=continue onclick=\"this.textContent='Done'\">Continue</button></main>",
  );
  await app.Menu.Continue.click();
  await expect(page.locator("#continue")).toHaveText("Done");
  await expect(page.locator("#decoy")).toHaveText("Decoy");
});
// #endregion essential

// #region forms
class Form extends DomPageObject {
  override defaultTarget = "form";
  Name = TextInput.create(this, "input[type=text]");
  Agree = Checkbox.create(this, "input[type=checkbox]");
  Choice = Select.create(this, "select");
}
test("complete form actions need no raw reads", async ({ page }) => {
  await page.setContent(
    "<form><input type=text><input type=checkbox><select><option value=a>A</option><option value=b>B</option></select></form>",
  );
  const form = Form.create(page);
  await form.Name.fill("Ada");
  await form.Name.selectText();
  await form.Name.clear();
  await form.Name.fill("Grace");
  await form.Name.selectText();
  await form.Name.appendText(" Hopper");
  await form.Agree.check();
  await form.Agree.uncheck();
  await form.Agree.setChecked(true);
  await form.Choice.selectOption("b");
  await expect(page.locator("form input[type=text]")).toHaveValue("Grace Hopper");
  await expect(page.locator("form input[type=checkbox]")).toBeChecked();
  await expect(page.locator("form select")).toHaveValue("b");
});
// #endregion forms

// #region essential-authoring
import { EditableText } from "@pomeranian/lib-essential/editable-text";
import { checkLibrary, defaultInstanceType, type UnboundRoot } from "@pomeranian/core/authoring";

class CustomComponent extends DomPageObject {
  componentName = "Search";
}
class EditableComponent extends CustomComponent.with(EditableText) {
  override defaultTarget = "input";
}
class LibraryField<
  Root extends UnboundRoot = UnboundRoot,
  Value = string,
  Extra = boolean,
> extends Element.with(EditableText)<Root> {
  declare readonly [defaultInstanceType]: {
    instance: LibraryField;
    parameters: { root: Root; value: Value; extra: Extra };
  };
  override get root(): Root {
    return super.root;
  }
  override defaultTarget = "input";
  #value: Value | undefined = undefined;
  #extra: Extra | undefined = undefined;
  value(): Value | undefined {
    return this.#value;
  }
  extra(): Extra | undefined {
    return this.#extra;
  }
}
checkLibrary<LibraryField>()(LibraryField);
class BoundField extends LibraryField<App, number, Date> {}
// #endregion essential-authoring

test("essential capabilities support custom bases and generic library authoring", async ({
  page,
}) => {
  await page.setContent("<main><input></main>");
  const custom = EditableComponent.create(page);
  expect(custom.componentName).toBe("Search");
  await custom.fill("custom");
  await custom.appendText(" text");
  await expect(page.locator("main input")).toHaveValue("custom text");
  const plain = LibraryField.create(page);
  const value: string | undefined = plain.value();
  const extra: boolean | undefined = plain.extra();
  expect([value, extra]).toEqual([undefined, undefined]);
  await rootFixture(App)({ page }, async (app) => {
    const bound = BoundField.create(app);
    const root: App = bound.root;
    const value: number | undefined = bound.value();
    const extra: Date | undefined = bound.extra();
    expect(root).toBe(app);
    expect([value, extra]).toEqual([undefined, undefined]);
    await bound.clear();
    await bound.appendText("bound");
    await expect(page.locator("main input")).toHaveValue("bound");
  });
});

// #region append
class Search extends TextInput<App> {
  override defaultTarget = "input[type=search]";
}
test("standalone and app-bound controls append native text", async ({ page }) => {
  await page.setContent("<main><input type=search value=Hello><textarea>First</textarea></main>");
  const notes = TextArea.create(page, "textarea");
  await notes.appendText("\nSecond", { timeout: 1000 });
  await expect(page.locator("main textarea")).toHaveValue("First\nSecond");
  await expect(page.locator("main input[type=search]")).toHaveValue("Hello");
  await rootFixture(App)({ page }, async (app) => {
    const search = Search.create(app);
    await search.selectText();
    await search.appendText(" world");
    await expect(page.locator("main input[type=search]")).toHaveValue("Hello world");
    await expect(page.locator("main textarea")).toHaveValue("First\nSecond");
    expect(search.root).toBe(app);
  });
});
// #endregion append
