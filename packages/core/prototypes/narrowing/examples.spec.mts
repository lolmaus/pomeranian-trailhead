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
  const last = Reflect.get(source, "last") as (() => typeof source) | undefined;
  const nth = Reflect.get(source, "nth") as ((index: number) => typeof source) | undefined;
  const filter = Reflect.get(source, "filter") as
    | ((options?: { hasText?: string; visible?: boolean }) => typeof source)
    | undefined;
  expect(typeof last).toBe("function");
  expect(typeof nth).toBe("function");
  expect(typeof filter).toBe("function");
  await expect(last!.call(source).locator).toHaveText("Sale D");
  await expect(nth!.call(source, 1).locator).toHaveText("Sale B");
  const sales = filter!.call(source, { hasText: "Sale", visible: true });
  await expect(sales.locator).toHaveText(["Sale B", "Sale C"]);
  await expect(sales.first().locator).toHaveText("Sale B");
  await expect(filter!.call(source.first(), { hasText: "Sale" }).locator).toHaveCount(0);
  expect(filter!.call(source)).not.toBe(source);
  await expect(source.locator).toHaveCount(4);
});
