import { test, expect } from "@playwright/test";
import { storyURL } from "../src/story-server.mts";
const baseURL = storyURL(Number(process.env["STORYBOOK_SUPPORT_PORT"] ?? 6007));
import { typedStories } from "../src/stories.mts";
const open = typedStories<typeof import("./fixtures/counter.stories.tsx")>("HTML/Counter", {
  baseURL: baseURL,
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
    await context.addCookies([{ name: "scenario", value: scenario, url: baseURL }]);
    await page.getByRole("button").click();
    await expect(page.getByRole("button", { name: "Count: 1" })).toBeVisible();
  });
}
test("real excluded helper fails discovery", async ({ page }) => {
  await expect(open(page, "Helper")).rejects.toThrow(/found 0.*excludeStories/s);
});
test("undiscovered file fails clearly", async ({ page }) => {
  const hidden = typedStories<typeof import("./fixtures/not-indexed.tsx")>("Hidden/Undiscovered", {
    baseURL: baseURL,
    ready: (p) => p.getByRole("button"),
  });
  await expect(hidden(page, "Hidden")).rejects.toThrow(
    /Hidden\/Undiscovered.*found 0.*title prefixes/s,
  );
});
test("real throwing story and never-ready story report context", async ({ page }) => {
  const checked = typedStories<typeof import("./fixtures/counter.stories.tsx")>("HTML/Counter", {
    baseURL: baseURL,
    ready: (p) => p.getByRole("button", { name: "Count: 0" }),
    timeout: 1500,
  });
  await expect(checked(page, "Throwing")).rejects.toThrow(
    /HTML\/Counter\/Throwing.*Counter fixture render exploded/s,
  );
  await expect(checked(page, "NotReady")).rejects.toThrow(/HTML\/Counter\/NotReady.*Timeout/s);
});

test("manager catalog opens the manually interactive scenario", async ({ page }) => {
  await page.goto(baseURL);
  await expect(page.locator("#html")).toContainText("HTML");
  await page.getByRole("button", { name: "Counter", exact: true }).click();
  await page.getByRole("link", { name: "Readable counter", exact: true }).click();
  const preview = page.frameLocator("#storybook-preview-iframe");
  await preview.getByRole("button", { name: "Count: 0" }).click();
  await expect(preview.getByRole("button", { name: "Count: 1" })).toBeVisible();
});

test("same binding sees live IDs and removed discovery without an index cache", async ({
  page,
}) => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const directory = await mkdtemp(new URL("./fixtures/live-", import.meta.url).pathname);
  const file = `${directory}/live.stories.tsx`;
  const source = (id: string) =>
    `const meta={title:"Live/Freshness",id:"${id}"} as const;export default meta;export const Ready={render:()=> <button>Live ready</button>};`;
  const live = typedStories<{ default: { title: "Live/Freshness" }; Ready: object }>(
    "Live/Freshness",
    { baseURL, ready: (p) => p.getByRole("button", { name: "Live ready" }) },
  );
  const ids = async () => {
    const response = await page.request.get(`${baseURL}/index.json`, {
      headers: { "Cache-Control": "no-cache" },
    });
    const index = (await response.json()) as {
      entries: Record<string, { title: string; id: string }>;
    };
    return Object.values(index.entries)
      .filter((e) => e.title === "Live/Freshness")
      .map((e) => e.id);
  };
  try {
    await writeFile(file, source("live-first"));
    await expect.poll(ids, { timeout: 15000 }).toEqual(["live-first--ready"]);
    await live(page, "Ready");
    expect(page.url()).toContain("id=live-first--ready");
    await writeFile(file, source("live-second"));
    await expect.poll(ids, { timeout: 15000 }).toEqual(["live-second--ready"]);
    await live(page, "Ready");
    expect(page.url()).toContain("id=live-second--ready");
    await rm(directory, { recursive: true, force: true });
    await expect.poll(ids, { timeout: 15000 }).toEqual([]);
    await expect(live(page, "Ready")).rejects.toThrow("found 0");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("configured title prefix is verified against the real generated index", async ({ page }) => {
  const response = await page.request.get(`${baseURL}/index.json`);
  const index = (await response.json()) as {
    entries: Record<string, { title: string; exportName: string }>;
  };
  expect(Object.values(index.entries)).toContainEqual(
    expect.objectContaining({ title: "Configured prefix/Hidden/Counter", exportName: "Hidden" }),
  );
  const prefixed = typedStories<typeof import("./prefix/prefixed.stories.tsx")>("Hidden/Counter", {
    baseURL,
    ready: (p) => p.getByRole("button"),
  });
  await expect(prefixed(page, "Hidden")).rejects.toThrow(
    /Hidden\/Counter.*found 0.*title prefixes/s,
  );
});
