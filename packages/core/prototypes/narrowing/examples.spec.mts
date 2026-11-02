// THROWAWAY #11: typed reconstruction evidence, not production core.
import { test, expect } from "@playwright/test";
import { DomPageObject } from "./probe.mts";

test("first reconstructs the concrete class and reinitializes its custom fields", async ({
  page,
}) => {
  await page.setContent('<div class="row">A</div><div class="row">B</div>');
  class Row extends DomPageObject<null> {
    override readonly defaultTarget = ".row";
    label = "Initial";
    #count = 0;
    increment(): number {
      return ++this.#count;
    }
    custom(): string {
      return "Row API";
    }
  }
  const source = Row.create(page);
  source.label = "Changed";
  expect(source.increment()).toBe(1);
  expect(source.increment()).toBe(2);
  const derived = source.first();
  expect(derived).not.toBe(source);
  expect(derived).toBeInstanceOf(Row);
  expect(derived.custom()).toBe("Row API");
  expect(derived.label).toBe("Initial");
  expect(derived.increment()).toBe(1);
  expect(source.increment()).toBe(3);
  await expect(derived.locator).toHaveText("A");
  await expect(source.locator).toHaveCount(2);
});

test("position and filter operations compose in order over the existing matches", async ({
  page,
}) => {
  await page.setContent("<p>A</p><p>Sale B</p><p>Sale C</p><p hidden>Sale D</p>");
  const source = DomPageObject.create(page, "p");
  await expect(source.last().locator).toHaveText("Sale D");
  await expect(source.nth(1).locator).toHaveText("Sale B");
  const sales = source.filter({ hasText: "Sale", visible: true });
  await expect(sales.locator).toHaveText(["Sale B", "Sale C"]);
  await expect(sales.first().locator).toHaveText("Sale B");
  await expect(source.first().filter({ hasText: "Sale" }).locator).toHaveCount(0);
  expect(source.filter()).not.toBe(source);
  await expect(source.locator).toHaveCount(4);
});
