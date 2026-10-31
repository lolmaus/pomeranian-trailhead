import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { prepare, guideHistory, repoRoot } from "../lib/prepare.mts";
import { registeredSources } from "../lib/sources.mts";
import { content } from "../lib/content.mts";

test("builds site inputs and shared model from actual comments and checked guide sources", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "pomeranian-content-"));
  try {
    const model = await prepare(output);
    expect(model.pages.some((page) => page.path === "getting-started.md")).toBe(true);
    expect(
      model.pages.find((page) => page.path === "getting-started.md")?.document.examples,
    ).toEqual([expect.objectContaining({ path: "examples/inline.spec.mts", region: "scenario" })]);
    expect(model.api?.symbols.map((symbol) => symbol.name)).toEqual(
      expect.arrayContaining([
        "testConfig",
        "typedStories",
        "StoryTitle",
        "StoryOptions",
        "storyURL",
        "storyServer",
        "assertStoryHost",
      ]),
    );
    expect(await readFile(path.join(model.site, "guides/testing.md"), "utf8")).toContain(
      "export const exampleConfig",
    );
    expect(
      await readFile(path.join(model.site, "reference/prototype-helpers.md"), "utf8"),
    ).toContain("type TargetArguments<Instance>");
    expect(await readFile(path.join(output, "content-model.json"), "utf8")).toContain(
      "ownerByReflection",
    );
    const sources = await registeredSources(repoRoot);
    const missing = model.pages.map((page) =>
      page.path === "guides/testing.md"
        ? { ...page, document: content("# Missing history\n") }
        : page,
    );
    expect(() => guideHistory(missing, model.api, sources)).toThrow(
      "Missing corresponding guide history",
    );
    expect(() =>
      guideHistory(
        [
          ...model.pages,
          {
            path: "invalid.md",
            origin: "authored",
            document: content("# Invalid\n\nAvailable since @repo/test-support@1.2.3\n"),
          },
        ],
        model.api,
        sources,
      ),
    ).toThrow("Guide history does not match");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
