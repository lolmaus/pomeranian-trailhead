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
      model.pages.some(
        (page) => page.path === "reference/development/config/variables/testConfig.md",
      ),
    ).toBe(true);
    expect(
      model.pages.find((page) => page.path === "getting-started.md")?.document.examples,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "examples/inline.spec.mts", region: "scenario" }),
        expect.objectContaining({ path: "examples/core.spec.mts", region: "construction" }),
      ]),
    );
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
    const discovery = await readFile(path.join(model.site, "public/llms.txt"), "utf8");
    expect(discovery).toContain("/text/getting-started.txt");
    expect(await readFile(path.join(model.site, "public/text/getting-started.txt"), "utf8")).toBe(
      model.pages.find((page) => page.path === "getting-started.md")?.document.markdown,
    );
    const core = model.api.symbols.find(
      (symbol) => symbol.package === "@pomeranian/core" && symbol.name === "DomPageObject",
    );
    expect(core).toBeDefined();
    const corePage = core?.html
      .split("#")[0]
      ?.replace(/^\//, "")
      .replace(/\.html$/, ".md");
    expect(await readFile(path.join(model.site, corePage ?? "missing"), "utf8")).toContain(
      "Unreleased core API",
    );
    expect(await readFile(path.join(model.site, corePage ?? "missing"), "utf8")).not.toContain(
      "private workspace API",
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
