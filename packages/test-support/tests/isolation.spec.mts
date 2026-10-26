import { expect, test } from "@playwright/test";

// Both scenarios mutate the same origin. Neither may inherit the other's state.
for (const scenario of ["first", "second"]) {
  test(`${scenario} scenario starts fresh and keeps ordinary state within its test`, async ({
    page,
    context,
  }) => {
    expect(page.url()).toBe("about:blank");
    expect(await context.cookies()).toEqual([]);
    await page.route("http://fixture.test/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<button>Save</button>" }),
    );
    await page.goto("http://fixture.test/");
    expect(await page.evaluate(() => localStorage.getItem("scenario"))).toBeNull();
    await page.evaluate((value) => localStorage.setItem("scenario", value), scenario);
    await context.addCookies([{ name: "scenario", value: scenario, url: "http://fixture.test" }]);
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem("scenario"))).toBe(scenario);
    expect((await context.cookies())[0]?.value).toBe(scenario);
  });
}
