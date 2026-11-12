import { test, expect } from "@playwright/test";
import { textArtifacts } from "../lib/text.mts";

test("text discovery preserves full topics and individual API members", () => {
  const markdown =
    "# Example\n\n## create\n\n`create(page)`\n\n```ts\nconst x = 1;\n```\n\n## root\n\nApp or null.\n";
  const output = textArtifacts(
    [{ path: "reference/core.md", document: { markdown } }],
    [
      {
        key: "core/type",
        name: "Core",
        package: "@pomeranian/core",
        kind: "Class",
        html: "/reference/core.html",
        parent: null,
      },
      {
        key: "core/type/create",
        name: "create",
        package: "@pomeranian/core",
        kind: "Method",
        html: "/reference/core.html#create",
        parent: "core/type",
      },
    ],
  );
  expect(output.get("text/reference/core.txt")).toBe(markdown);
  expect(output.get("llms.txt")).toContain("/text/reference/core.txt");
  expect(output.get("text/members/core%2Ftype%2Fcreate.txt")).toContain("const x = 1");
  expect(output.get("text/packages/%40pomeranian%2Fcore.txt")).toContain("create");
  expect(output.get("text/types/core%2Ftype.txt")).toContain(
    "/text/members/core%252Ftype%252Fcreate.txt",
  );
});

test("production reference status never calls delivered core private infrastructure", async () => {
  const { referenceNotice } = await import("../lib/prepare.mts");
  expect(referenceNotice("production")).toContain("@pomeranian/core");
  expect(referenceNotice("production")).not.toContain("private workspace");
  expect(referenceNotice("development")).toContain("private workspace API");
});

test("member chunks omit unrelated members while retaining class generic context and overloads", () => {
  const markdown =
    "# Class: Box<T>\n\n## Type Parameters\n\n### T\n\nstring\n\n## Methods\n\n### read()\n\nread(): T\n\nread(key): T\n\n### write()\n\nUNRELATED\n";
  const output = textArtifacts(
    [{ path: "box.md", document: { markdown } }],
    [
      {
        key: "read",
        name: "read",
        package: "core",
        kind: "Method",
        html: "/box.html#read",
        parent: "box",
      },
    ],
  );
  const text = output.get("text/members/read.txt");
  expect(text).toContain("Class: Box<T>");
  expect(text).toContain("read(key): T");
  expect(text).not.toContain("UNRELATED");
});

test("package and type discovery reaches inherited member chunks with generic class context", () => {
  const markdown =
    "# Class: Derived<R>\n\n## Type Parameters\n\n### R\n\nRoot type.\n\n## Methods\n\n### inherited()\n\nInherited from Base<R>.\n\ninherited(): R\n\n## Since\n\nAvailable since @pomeranian/core@Unreleased\n";
  const symbols = [
    {
      key: "core/Derived",
      name: "Derived",
      package: "@pomeranian/core",
      kind: "Class",
      html: "/derived.html",
      parent: null,
    },
    {
      key: "core/Derived/inherited",
      name: "inherited",
      package: "@pomeranian/core",
      kind: "Method",
      html: "/derived.html#inherited",
      parent: "core/Derived",
    },
  ];
  const output = textArtifacts([{ path: "derived.md", document: { markdown } }], symbols);
  const index = output.get("text/types/core%2FDerived.txt") ?? "";
  expect(index).toContain("inherited");
  const member = output.get("text/members/core%2FDerived%2Finherited.txt");
  expect(member).toContain("Class: Derived<R>");
  expect(member).toContain("Inherited from Base<R>");
  for (const [name, text] of output) {
    if (
      name !== "llms.txt" &&
      !name.startsWith("text/types/") &&
      !name.startsWith("text/packages/")
    )
      continue;
    for (const match of text.matchAll(/\]\((\/[^)]+)\)/g)) {
      expect(
        output.has(decodeURIComponent((match[1] ?? "").slice(1))),
        `broken text discovery in ${name}: ${match[1]}`,
      ).toBe(true);
    }
  }
});

test("replacing public text removes renamed topics and obsolete members", async () => {
  const { mkdtemp, readFile, rm, access, mkdir, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { replaceTextAssets } = await import("../lib/text.mts");
  const root = await mkdtemp(path.join(tmpdir(), "pomeranian-text-"));
  try {
    await mkdir(path.join(root, "text/members"), { recursive: true });
    await writeFile(path.join(root, "text/old.txt"), "stale topic");
    await writeFile(path.join(root, "text/members/old.txt"), "stale member");
    await replaceTextAssets(
      root,
      new Map([
        ["llms.txt", "new index"],
        ["text/new.txt", "new topic"],
      ]),
    );
    expect(
      await access(path.join(root, "text/old.txt")).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
    expect(
      await access(path.join(root, "text/members/old.txt")).then(
        () => true,
        () => false,
      ),
    ).toBe(false);
    expect(await readFile(path.join(root, "text/new.txt"), "utf8")).toBe("new topic");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production helper context is derived from declarations and fails on missing helpers", async () => {
  const { authoringContext } = await import("../lib/prepare.mts");
  const source =
    "export type Class = Function; type Default<I> = I; type Equal<A,B> = true; type Erased<A> = false; type IsAny<T> = false; export type Result<C extends Class> = C; export type Context<R> = R; export type TargetArguments<I> = [I];";
  expect(authoringContext(source)).toContain("export type Result<C extends Class> = C;");
  expect(authoringContext(source)).toContain("production authoring");
  expect(() => authoringContext("export type Class = Function;")).toThrow(
    "Missing production authoring helper",
  );
});
