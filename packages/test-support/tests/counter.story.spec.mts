import { test, expect } from "@playwright/test";
import { typedStories } from "../src/stories.mts";
const open = typedStories<typeof import("./fixtures/counter.stories.tsx")>("HTML/Counter", {
  baseURL: "http://127.0.0.1:6006",
  ready: (p) => p.getByRole("button", { name: "Count: 0" }),
});
test("extracted HTML counter changes ordinary state", async ({ page }) => {
  await open(page, "Counting");
  await page.getByRole("button", { name: "Count: 0" }).click();
  await expect(page.getByRole("button", { name: "Count: 1" })).toBeVisible();
});

for (const scenario of ["first", "second"]) {
  test(`${scenario} story context starts fresh`, async ({ page, context }) => {
    expect(await context.cookies()).toEqual([]);
    await open(page, "Counting");
    expect(await page.evaluate(() => localStorage.getItem("scenario"))).toBeNull();
    await page.evaluate((value) => localStorage.setItem("scenario", value), scenario);
    await context.addCookies([{ name: "scenario", value: scenario, url: "http://127.0.0.1:6006" }]);
    await page.getByRole("button").click();
    await expect(page.getByRole("button", { name: "Count: 1" })).toBeVisible();
  });
}
test("real excluded helper fails discovery", async ({ page }) => {
  await expect(open(page, "Helper")).rejects.toThrow(/found 0.*excludeStories/s);
});
test("undiscovered file and title-prefix mismatch fail clearly", async ({ page }) => {
  const hidden = typedStories<typeof import("./fixtures/undiscovered.tsx")>("Hidden/Counter", {
    baseURL: "http://127.0.0.1:6006",
    ready: (p) => p.getByRole("button"),
  });
  await expect(hidden(page, "Hidden")).rejects.toThrow(/Hidden\/Counter.*found 0.*title prefixes/s);
});
test("real throwing story and never-ready story report context", async ({ page }) => {
  const checked = typedStories<typeof import("./fixtures/counter.stories.tsx")>("HTML/Counter", {
    baseURL: "http://127.0.0.1:6006",
    ready: (p) => p.getByRole("button", { name: "Count: 0" }),
    timeout: 1500,
  });
  await expect(checked(page, "Throwing")).rejects.toThrow(
    /HTML\/Counter\/Throwing.*Counter fixture render exploded/s,
  );
  await expect(checked(page, "NotReady")).rejects.toThrow(/HTML\/Counter\/NotReady.*Timeout/s);
});
