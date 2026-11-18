import { test, expect } from "@playwright/test";
import { corpusCheck } from "../lib/corpus-check.mts";
import { textArtifacts } from "../lib/text.mts";

const pages = [
  { path: "guide.md", document: { markdown: "# Café & Usage\n\n[API](api.html#read)\n" } },
  {
    path: "api.md",
    document: {
      markdown:
        "# API\n\n## read\n\nread(): string\n\nread(key: string): string\n\n```ts\nread('é');\n```\n\n[Guide](guide.md#cafe-usage)\n",
    },
  },
];
const symbols = [
  {
    key: "read",
    name: "read",
    package: "core",
    kind: "Function",
    html: "/api.html#read",
    parent: null,
  },
];

test("renamed public re-exports validate the canonical declaration's signature", () => {
  const canonical = { ...symbols[0]!, signatures: 1, history: ["Available since core@1.0.0"] };
  const alias = { ...canonical, key: "renamed", name: "renamed", aliasOf: "read" };
  const documents = [
    {
      path: "api.md",
      document: { markdown: "# read\n\n> **read**(): `string`\n\nAvailable since core@1.0.0\n" },
    },
  ];
  expect(() => textArtifacts(documents, [canonical, alias])).not.toThrow();
});

test("corpus rejects omitted canonical documents and independently detects omitted payload", () => {
  const output = textArtifacts(pages, symbols);
  output.delete("api.md");
  expect(() => corpusCheck(pages, symbols, output)).toThrow("Missing canonical document: api.md");
  const incomplete = textArtifacts(pages, symbols);
  incomplete.set(
    "api.md",
    (incomplete.get("api.md") ?? "").replace("read(key: string): string", ""),
  );
  expect(() => corpusCheck(pages, symbols, incomplete)).toThrow("Content loss in api.md");
});

test("corpus rejects broken anchors, missing symbol inventory, collisions, aliases and orphans", () => {
  const output = textArtifacts(pages, symbols);
  const broken = new Map(output);
  broken.set("guide.md", "# Café & Usage\n\n[API](/api.md#missing)\n");
  expect(() => corpusCheck(pages, symbols, broken)).toThrow("Broken Markdown anchor");
  expect(() => corpusCheck(pages, [{ ...symbols[0]!, html: "/missing.html" }], output)).toThrow(
    "Missing symbol document",
  );
  expect(() => corpusCheck(pages, [{ ...symbols[0]!, aliasOf: "unknown" }], output)).toThrow(
    "Unresolved alias",
  );
  expect(() =>
    corpusCheck([...pages, { ...pages[0]!, path: "Guide.md" }], symbols, output),
  ).toThrow("Duplicate canonical document");
  const orphan = new Map(output);
  orphan.set("orphan.md", "# Unreachable\n");
  expect(() => corpusCheck(pages, symbols, orphan)).toThrow("Orphan Markdown resource: orphan.md");
});

test("website-compatible Unicode, code, duplicate and explicit heading anchors resolve", async () => {
  const markdown =
    "# Café & `Usage`\n\n## Repeat\n\n## Repeat\n\n## Owner {#custom-owner}\n\n[Unicode](#cafe-usage) [Duplicate](#repeat-1) [Explicit](#custom-owner)\n";
  const documents = [{ path: "guides/é.md", document: { markdown } }];
  expect(() => corpusCheck(documents, [], textArtifacts(documents, []))).not.toThrow();
  // Load the runtime seam without pulling VitePress's unrelated client types into docs checks.
  const rendererModule = "vitepress";
  const { createMarkdownRenderer } = await import(rendererModule);
  const renderer = await createMarkdownRenderer(process.cwd(), { lineNumbers: false });
  const html = renderer.render(markdown);
  for (const id of ["cafe-usage", "repeat", "repeat-1", "custom-owner"])
    expect(html).toContain(`id="${id}"`);
});

test("source expectations reject renderer omissions before publication", () => {
  const expected = [
    {
      ...symbols[0]!,
      signatures: 2,
      history: ["Available since core@1.0.0"],
      payload: {
        comments: ["Both overloads are documented.", "read('é');"],
        signatures: 2,
        getter: false,
        setter: false,
      },
    },
  ];
  const complete = [
    {
      path: "api.md",
      document: {
        markdown:
          "# read\n\n> **read**(): `string`\n\n> **read**(`key`): `string`\n\nBoth overloads are documented.\n\nAvailable since core@1.0.0\n\n```ts\nread('é');\n```\n",
      },
    },
  ];
  expect(() => textArtifacts(complete, expected)).not.toThrow();
  const omittedOverload = [
    {
      path: "api.md",
      document: {
        markdown: complete[0]!.document.markdown.replace("> **read**(`key`): `string`\n\n", ""),
      },
    },
  ];
  expect(() => textArtifacts(omittedOverload, expected)).toThrow("Missing API signatures");
  const omittedExample = [
    {
      path: "api.md",
      document: {
        markdown: complete[0]!.document.markdown.replace("```ts\nread('é');\n```\n", ""),
      },
    },
  ];
  expect(() => textArtifacts(omittedExample, expected)).toThrow("Missing API payload");
  const omittedHistory = [
    {
      path: "api.md",
      document: {
        markdown: complete[0]!.document.markdown.replace("Available since core@1.0.0", ""),
      },
    },
  ];
  expect(() => textArtifacts(omittedHistory, expected)).toThrow("Missing API history");
});
