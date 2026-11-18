import { test, expect } from "@playwright/test";
import { textArtifacts, replaceTextAssets } from "../lib/text.mts";

const pages = [
  {
    path: "guides/usage.md",
    document: { markdown: "# Usage\n\nLearn café usage.\n\n[Type](../reference/type.md#read)\n" },
  },
  {
    path: "reference/type.md",
    document: {
      markdown:
        "# Type\n\n## read\n\n[Guide](../guides/usage.html?mode=all#usage)\n\n[reference][guide]\n\n[guide]: ../guides/usage.md\n",
    },
  },
];
const symbols = [
  {
    key: "type",
    name: "Type",
    package: "core",
    kind: "Class",
    html: "/reference/type.html",
    parent: null,
  },
];

test("canonical Markdown and all six discovery levels share complete document bodies", () => {
  const output = textArtifacts(pages, symbols);
  expect(output.get("guides/usage.md")).toContain("](/reference/type.md#read)");
  expect(output.get("reference/type.md")).toContain("](/guides/usage.md?mode=all#usage)");
  expect(output.get("reference/type.md")).toContain("[guide]: /guides/usage.md");
  expect([...output.keys()].some((name) => name.startsWith("text/"))).toBe(false);
  expect(output.get("llms.txt")).toContain("## Topics");
  expect(output.get("llms.txt")).toContain("Learn café usage.");
  expect(output.get("indexes/packages/core.md")).toContain("/reference/type.md");
  expect(output.get("indexes/types/type.md")).toContain("/reference/type.md");
  expect(output.get("bundles/sections/guides.md")).toContain("Learn café usage.");
  expect(output.get("bundles/packages/core.md")).toContain("# Type");
  expect(output.get("llms-full.txt")).toContain("# Usage");
  expect(output.get("llms-full.txt")).toContain("# Type");
});

test("production reference status never calls delivered core private infrastructure", async () => {
  const { referenceNotice } = await import("../lib/prepare.mts");
  expect(referenceNotice("production")).toContain("@pomeranian/core");
  expect(referenceNotice("production")).not.toContain("private workspace");
  expect(referenceNotice("development")).toContain("private workspace API");
});

test("production helper context is derived from declarations and fails on missing helpers", async () => {
  const { authoringContext } = await import("../lib/prepare.mts");
  const source =
    "export type Constructor<I = object> = new (...args: any[]) => I; export type Class = Function; type Default<I> = I; type Equal<A,B> = true; type Erased<A> = false; type IsAny<T> = false; export type Result<C extends Class> = C; export type Context<R> = R; export type TargetArguments<I> = [I];";
  expect(authoringContext(source)).toContain("export type Result<C extends Class> = C;");
  expect(authoringContext(source)).toContain("production authoring");
  expect(authoringContext(source)).toContain("export type Constructor<I = object>");
  expect(() => authoringContext("export type Class = Function;")).toThrow(
    "Missing production authoring helper",
  );
});

test("bundles preserve code and external links exactly, deduplicate aliases and advertise actual UTF-8 bytes", () => {
  const literal =
    "`[literal](missing.md)`\n\n```md\n[literal](missing.md)\n```\n\n[External](https://example.com/a?q=%2F#Frag)\n";
  const documents = [
    { ...pages[0]!, document: { markdown: pages[0]!.document.markdown + literal } },
    pages[1]!,
  ];
  const output = textArtifacts(documents, [
    ...symbols,
    { ...symbols[0]!, key: "alias", name: "Alias", aliasOf: "type" },
  ]);
  expect(output.get("guides/usage.md")).toContain(literal);
  const full = output.get("llms-full.txt") ?? "";
  expect(full).toContain(literal);
  expect(full.match(/<!-- BEGIN DOCUMENT: \/reference\/type.md -->/g)).toHaveLength(1);
  expect(output.get("indexes/bundles.md")).toContain(
    `${Buffer.byteLength(full, "utf8")} UTF-8 bytes`,
  );
  expect(output.get("indexes/bundles.md")).toContain("2 documents");
  expect(textArtifacts([...documents].reverse(), [...symbols]).get("llms-full.txt")).toBe(full);
});

test("replacing public resources removes stale canonical paths and legacy text without touching unrelated assets", async () => {
  const { mkdtemp, readFile, rm, access, mkdir, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const root = await mkdtemp(path.join(tmpdir(), "pomeranian-text-"));
  try {
    await mkdir(path.join(root, "text/members"), { recursive: true });
    await writeFile(path.join(root, "text/members/old.txt"), "legacy");
    await writeFile(path.join(root, "logo.svg"), "unrelated");
    await replaceTextAssets(
      root,
      new Map([
        ["old/topic.md", "old"],
        ["llms.txt", "old index"],
      ]),
    );
    await replaceTextAssets(root, new Map([["new/topic.md", "new"]]));
    for (const name of ["old/topic.md", "text/members/old.txt", "llms.txt"])
      expect(
        await access(path.join(root, name)).then(
          () => true,
          () => false,
        ),
      ).toBe(false);
    expect(await readFile(path.join(root, "new/topic.md"), "utf8")).toBe("new");
    expect(await readFile(path.join(root, "logo.svg"), "utf8")).toBe("unrelated");
    await expect(replaceTextAssets(root, new Map([["../escape.md", "bad"]]))).rejects.toThrow(
      "Unsafe text asset",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("discovery stays compact as API members grow while topic indexes retain complete coverage", () => {
  const documents = Array.from({ length: 80 }, (_, index) => ({
    path: `reference/member-${index}.md`,
    document: { markdown: `# Member ${index}\n\nComplete member ${index}.\n` },
  }));
  const output = textArtifacts(documents, []);
  expect(Buffer.byteLength(output.get("llms.txt") ?? "")).toBeLessThan(2000);
  expect(output.get("indexes/topics/reference.md")).toContain("/reference/member-79.md");
});

test("index labels use heading text without relocating breadcrumb links", () => {
  const documents = [
    { path: "reference/index.md", document: { markdown: "# Reference\n\nPackage reference.\n" } },
    {
      path: "reference/classes/Type.md",
      document: { markdown: "[Reference](../index.md) / Type\n\n# Type\n\nType documentation.\n" },
    },
  ];
  expect(() => textArtifacts(documents, [])).not.toThrow();
  expect(textArtifacts(documents, []).get("indexes/topics/reference.md")).toContain(
    "[Type](/reference/classes/Type.md)",
  );
});

test("generated indexes cannot overwrite canonical pages even with identical bytes", () => {
  expect(() =>
    textArtifacts([{ path: "indexes/types.md", document: { markdown: "# Types\n\n\n" } }], []),
  ).toThrow("Duplicate resource path: indexes/types.md");
});
