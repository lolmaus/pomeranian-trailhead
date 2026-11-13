import { test, expect } from "@playwright/test";
// #region essential
import { DomPageObject, PageObject, rootFixture } from "@pomeranian/core";
import { Element } from "@pomeranian/lib-essential";
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
    "<main><button onclick=\"this.textContent='Done'\">Continue</button></main>",
  );
  await app.Menu.Continue.click();
  await expect(app.Menu.Continue.locator).toHaveText("Done");
});
// #endregion essential

// #region forms
class Form extends DomPageObject {
  override defaultTarget = "form";
  Name = Element.create(this, "input[type=text]");
  Agree = Element.create(this, "input[type=checkbox]");
  Choice = Element.create(this, "select");
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
  await form.Agree.check();
  await form.Agree.uncheck();
  await form.Agree.setChecked(true);
  await form.Choice.selectOption("b");
  await expect(form.Name.locator).toHaveValue("Grace");
  await expect(form.Agree.locator).toBeChecked();
  await expect(form.Choice.locator).toHaveValue("b");
});
// #endregion forms
