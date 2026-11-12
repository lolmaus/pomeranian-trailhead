import { test, expect } from "@playwright/test";
import { PageObject } from "../src/page-object.ts";
test("children inherit their parent's Page context", ({ page }) => {
  const parent = PageObject.create(page);
  const child = PageObject.create(parent);
  expect(child.page).toBe(page);
  expect(child.root).toBeNull();
});

import { rootFixture } from "../src/root-fixture.ts";
test("fixture roots are established before child initialization", async ({ page }) => {
  class App extends PageObject<App> {
    Child = PageObject.create(this);
    SeenRoot = this.root;
  }
  await rootFixture(App)({ page }, async (app) => {
    expect(app.root).toBe(app);
    expect(app.SeenRoot).toBe(app);
    expect(app.Child.root).toBe(app);
  });
});
