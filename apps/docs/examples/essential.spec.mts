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
