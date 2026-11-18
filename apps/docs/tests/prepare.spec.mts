import { test, expect } from "@playwright/test";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import MarkdownIt from "markdown-it";
import { files } from "../lib/html-links.mts";
import path from "node:path";
import { tmpdir } from "node:os";
import { prepare, guideHistory, repoRoot, authoringContext } from "../lib/prepare.mts";
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
        "Fillable",
        "EditableValue",
        "EditableText",
        "Checkable",
        "CheckableUncheckable",
        "SelectableOptions",
        "TextInput",
        "TextArea",
        "Checkbox",
        "Radio",
        "Select",
        "ContentEditable",
        "Constructor",
        "with",
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
    expect(discovery).toContain("/getting-started.md");
    const gettingStartedText = await readFile(
      path.join(model.site, "public/getting-started.md"),
      "utf8",
    );
    expect(gettingStartedText).toContain("class App extends DomPageObject<App>");
    expect(gettingStartedText).toContain("](/installation.md)");
    expect(gettingStartedText).not.toContain("](installation.md)");
    for (const filename of ["guides/authoring.md", "public/guides/authoring.md"]) {
      const authoring = await readFile(path.join(model.site, filename), "utf8");
      expect(authoring).toContain("DomPageObject.with(Text, Counting, CountLabel)");
      expect(authoring).toContain("override get root(): Root");
      expect(authoring).toContain("Direct `new` remains unsupported");
      expect(authoring).toContain("this.Button");
    }
    for (const filename of [
      "reference/authoring-helpers.md",
      "public/reference/authoring-helpers.md",
    ]) {
      const helpers = await readFile(path.join(model.site, filename), "utf8");
      expect(helpers).toContain("type Compose<");
      expect(helpers).toContain("type Capabilities<");
    }
    const parser = new MarkdownIt();
    const publicRoot = path.join(model.site, "public");
    for (const filename of await files(publicRoot)) {
      if (!/\.(?:md|txt)$/.test(filename)) continue;
      const tokens = parser.parse(await readFile(filename, "utf8"), {});
      for (const token of tokens.flatMap((item) => item.children ?? [])) {
        if (token.type !== "link_open") continue;
        const href = token.attrGet("href") ?? "";
        if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(href)) continue;
        expect(href, `Markdown link in ${filename}`).toMatch(/^\//);
        const target = decodeURIComponent(href.split(/[?#]/)[0] ?? "");
        await expect(access(path.join(publicRoot, target))).resolves.toBeUndefined();
      }
    }
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
    const element = model.api.symbols.find(
      (symbol) =>
        symbol.package === "@pomeranian/lib-essential" &&
        symbol.name === "Element" &&
        !symbol.aliasOf,
    );
    expect(element).toBeDefined();
    const elementPage = element?.html
      .split("#")[0]
      ?.replace(/^\//, "")
      .replace(/\.html$/, ".md");
    const elementContent = await readFile(path.join(model.site, elementPage ?? "missing"), "utf8");
    expect(elementContent).toContain("@pomeranian/lib-essential");
    expect(elementContent).toContain("type");
    const legacyMethod = model.api.symbols.find(
      (symbol) => symbol.parent === element?.key && symbol.name === "type",
    );
    const legacyPage = legacyMethod?.html
      .split("#")[0]
      ?.replace(/^\//, "")
      .replace(/\.html$/, ".md");
    const legacyContent = await readFile(path.join(model.site, legacyPage ?? "missing"), "utf8");
    expect(legacyContent).toContain("Deprecated");
    expect(legacyContent).toContain("Use fill for replacement or pressSequentially");
    const essential = model.api.symbols.filter(
      (symbol) => symbol.package === "@pomeranian/lib-essential",
    );
    const elementMembers = essential.filter((symbol) => symbol.parent === element?.key);
    const elementNames = elementMembers.map((symbol) => symbol.name);
    expect(elementNames).toEqual(expect.arrayContaining(["selectText", "type", "click"]));
    for (const name of ["fill", "clear", "check", "uncheck", "setChecked", "selectOption"])
      expect(elementNames).not.toContain(name);
    for (const [name, methods] of [
      ["TextInput", ["fill", "clear", "appendText"]],
      ["TextArea", ["fill", "clear", "appendText"]],
      ["ContentEditable", ["fill", "clear"]],
      ["Checkbox", ["check", "uncheck", "setChecked"]],
      ["Radio", ["check"]],
      ["Select", ["selectOption"]],
    ] as const) {
      const owner = essential.find(
        (symbol) => symbol.name === name && symbol.kind === "Class" && !symbol.aliasOf,
      );
      expect(owner, name).toBeDefined();
      const members = essential.filter((symbol) => symbol.parent === owner?.key);
      for (const method of methods) {
        const inherited = members.find((symbol) => symbol.name === method);
        expect(inherited, `${name}.${method}`).toBeDefined();
        expect(inherited?.inherited, `${name}.${method}`).toBe(true);
        expect(inherited?.history).toContain(
          "Available since @pomeranian/lib-essential@Unreleased",
        );
      }
      if (name === "Radio") {
        expect(members.map((symbol) => symbol.name)).not.toContain("uncheck");
        expect(members.map((symbol) => symbol.name)).not.toContain("setChecked");
      }
      if (name !== "TextInput" && name !== "TextArea")
        expect(members.map((symbol) => symbol.name)).not.toContain("appendText");
    }
    for (const filename of ["api/lib-essential.md", "public/api/lib-essential.md"]) {
      const guide = await readFile(path.join(model.site, filename), "utf8");
      expect(guide).toContain("appendText");
      expect(guide).toContain("not atomic");
      expect(guide).toContain("/editable-text");
      expect(guide).toContain('await form.Name.appendText(" Hopper")');
    }
    const legacy = model.api.symbols.find(
      (symbol) => symbol.package === "@pomeranian/lib-essential" && symbol.name === "type",
    );
    expect(legacy?.history).toContain("Available since @pomeranian/lib-essential@Unreleased");
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

test("source-derived authoring context includes the public capability constructor", async () => {
  const source = await readFile(path.join(repoRoot, "packages/core/src/authoring.ts"), "utf8");
  expect(authoringContext(source)).toContain("export type Constructor<Instance = object>");
});

test("source-derived authoring context explains composition signature helpers", async () => {
  const source = await readFile(path.join(repoRoot, "packages/core/src/authoring.ts"), "utf8");
  const composition = await readFile(
    path.join(repoRoot, "packages/core/src/page-object.ts"),
    "utf8",
  );
  const rendered = authoringContext(source, composition);
  expect(rendered).toContain("type Compose<");
  expect(rendered).toContain("type Before<");
  expect(rendered).toContain("type Capabilities<");
  expect(() => authoringContext(source, "")).toThrow(
    "Missing production composition helper: Compose",
  );
});
