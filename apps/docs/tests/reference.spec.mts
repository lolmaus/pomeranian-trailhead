import { expect, test } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reference, type Source } from "../lib/reference.mts";
import { checkHtml } from "../lib/html-links.mts";

const root = fileURLToPath(new URL("..", import.meta.url));
const sources: Source[] = [
  {
    package: "@pomeranian/proof-core",
    entry: path.join(root, "fixtures/core.mts"),
    status: "fixture",
  },
  {
    package: "@pomeranian/proof-extension",
    entry: path.join(root, "fixtures/extension.mts"),
    status: "fixture",
  },
];

test("declaration keys survive unrelated entrypoint registration and retain real namespaces", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "pomeranian-stable-ownership-"));
  try {
    const alpha = path.join(output, "alpha.mts");
    const beta = path.join(output, "beta.mts");
    await writeFile(
      alpha,
      "/** Alpha value.\n * @since @pomeranian/alpha@Unreleased\n */\nexport const value = 42;\n/** Explicit namespace. */\nexport namespace Space {\n/** Nested value.\n * @since @pomeranian/alpha@Unreleased\n */\nexport const value = 7;\n}\n",
    );
    await writeFile(
      beta,
      "/** Beta value.\n * @since @pomeranian/beta@Unreleased\n */\nexport const value = 42;\n",
    );
    const entries: Source[] = [
      { package: "@pomeranian/alpha", entry: alpha, status: "fixture" },
      { package: "@pomeranian/beta", entry: beta, status: "fixture" },
    ];
    const first = await reference(entries.slice(0, 1), path.join(output, "single"));
    const second = await reference(entries, path.join(output, "multiple"));
    const declarations = (model: typeof first) =>
      model.symbols
        .filter((symbol) => symbol.package === "@pomeranian/alpha" && symbol.kind !== "Module")
        .map((symbol) => ({ key: symbol.key, parent: symbol.parent }))
        .sort((a, b) => a.key.localeCompare(b.key));
    expect(declarations(second)).toEqual(declarations(first));
    expect(
      first.symbols.some((symbol) =>
        symbol.key.includes("/namespace-instance-Space/variable-instance-value"),
      ),
    ).toBe(true);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("owns ordinary entrypoints by source path without requiring invented module names", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "pomeranian-entrypoints-"));
  try {
    const entries: Source[] = [];
    for (const name of ["alpha", "beta"]) {
      const entry = path.join(output, `${name}.mts`);
      const pkg = `@pomeranian/${name}`;
      await writeFile(
        entry,
        `/** An ordinary exported value.\n * @since ${pkg}@Unreleased\n */\nexport const value = 42;\n`,
      );
      entries.push({ package: pkg, entry, status: "fixture" });
    }
    const model = await reference(entries, path.join(output, "reference"));
    expect(
      model.symbols
        .filter((symbol) => symbol.name === "value")
        .map((symbol) => symbol.package)
        .sort(),
    ).toEqual(["@pomeranian/alpha", "@pomeranian/beta"]);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("reference exposes generic, overloaded, protected and inherited symbols across packages", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "pomeranian-reference-"));
  try {
    const model = await reference(sources, directory);
    expect(model.symbols.filter((symbol) => symbol.name === "Widget")).toHaveLength(2);
    const map = model.symbols.find(
      (symbol) => symbol.name === "map" && symbol.package === "@pomeranian/proof-core",
    );
    expect(map?.signatures).toBe(2);
    expect(model.symbols.some((symbol) => symbol.name === "transform" && symbol.protected)).toBe(
      true,
    );
    expect(model.symbols.some((symbol) => symbol.name === "map" && symbol.inherited)).toBe(true);
    expect(new Set(model.symbols.map((symbol) => symbol.key)).size).toBe(model.symbols.length);
    expect(
      model.symbols.filter(
        (symbol) => symbol.name === "identify" && symbol.package === "@pomeranian/proof-core",
      ),
    ).toHaveLength(2);
    expect(model.symbols.find((symbol) => symbol.name === "title")?.kind).toBe("Accessor");
    expect(
      model.symbols.find(
        (symbol) => symbol.name === "Widget" && symbol.package === "@pomeranian/proof-core",
      )?.history,
    ).toContain("Available since @pomeranian/proof-core@1.2.3");
    expect(
      model.symbols.find(
        (symbol) => symbol.name === "Widget" && symbol.package === "@pomeranian/proof-core",
      )?.history,
    ).toContain("Changed in @pomeranian/proof-core@1.4.0");
    const markdown = await readFile(
      path.join(directory, "reference", map?.html.split("#")[0]?.replace(/\.html$/, ".md") ?? ""),
      "utf8",
    );
    expect(markdown).toContain("Scalar overload");
    expect(markdown).toContain("Sequence overload");
    expect(markdown).toContain("Available since @pomeranian/proof-core@Unreleased");
    expect(markdown).toContain("readonly");
    expect(markdown).toContain("root");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rich reference builds with valid symbol routes and stable identities", async () => {
  test.setTimeout(60_000);
  await mkdir(path.join(root, ".generated"), { recursive: true });
  const output = await mkdtemp(path.join(root, ".generated/reference-regression-"));
  try {
    const first = await reference(sources, path.join(output, "first"));
    const second = await reference(sources, path.join(output, "second"));
    const stable = (model: typeof first) =>
      model.symbols.map(({ reflectionId: _id, ...symbol }) => symbol);
    expect(stable(second)).toEqual(stable(first));
    const site = path.join(output, "first/reference");
    await mkdir(path.join(site, ".vitepress"));
    await writeFile(path.join(site, ".vitepress/config.mjs"), "export default {};\n");
    await writeFile(
      path.join(site, "mapping-probe.md"),
      "# Complete symbol mappings\n\n" +
        first.symbols.map((symbol) => `- [${symbol.key}](${symbol.html})`).join("\n") +
        "\n",
    );
    const build = spawnSync(
      process.execPath,
      [path.join(root, "node_modules/vitepress/bin/vitepress.js"), "build", site],
      { encoding: "utf8", timeout: 40_000 },
    );
    expect(build.status, build.stdout + build.stderr).toBe(0);
    expect(await checkHtml(path.join(site, ".vitepress/dist"))).toBeGreaterThan(5);
    const widget = first.symbols.find(
      (symbol) => symbol.name === "Widget" && symbol.package === "@pomeranian/proof-core",
    );
    if (!widget) throw new Error("Fixture Widget missing");
    const html = await readFile(
      path.join(site, ".vitepress/dist", widget.html.split("#")[0] ?? ""),
      "utf8",
    );
    for (const expected of [
      "Scalar overload",
      "Sequence overload",
      "Getter documentation",
      "Setter documentation",
      "Available since @pomeranian/proof-core@1.2.3",
      "Changed in @pomeranian/proof-core@1.4.0",
    ])
      expect(html).toContain(expected);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

for (const [name, source, failure] of [
  ["missing documentation", "export const undocumented = 42;", "documentation validation failed"],
  [
    "wrong history owner",
    "/** Documented.\n * @since @pomeranian/other@Unreleased\n */\nexport const added = 42;",
    "Invalid package-qualified @since",
  ],
  [
    "invalid change history",
    "/** Documented.\n * @since @pomeranian/new@Unreleased\n * @remarks Changed in @pomeranian/new@banana: broken version.\n */\nexport const added = 42;",
    "Invalid package-qualified change history",
  ],
  [
    "unresolved symbol link",
    "/** See {@link DoesNotExist}.\n * @since @pomeranian/new@Unreleased\n */\nexport const added = 42;",
    "documentation validation failed",
  ],
  [
    "compiler failure",
    "/** Documented.\n * @since @pomeranian/new@Unreleased\n */\nexport const added: number = 'wrong';",
    "API conversion failed",
  ],
] as const) {
  test(`rejects ${name}`, async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "pomeranian-invalid-api-"));
    try {
      const entry = path.join(directory, "api.mts");
      await writeFile(entry, source);
      await expect(
        reference(
          [{ package: "@pomeranian/new", entry, status: "fixture" }],
          path.join(directory, "out"),
        ),
      ).rejects.toThrow(failure);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}

test("fails when an exported addition has no owning-package availability annotation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "pomeranian-history-"));
  try {
    const entry = path.join(directory, "api.mts");
    await writeFile(
      entry,
      "/** Documented addition without availability metadata. */\nexport const added = 42;\n",
    );
    await expect(
      reference(
        [{ package: "@pomeranian/new", entry, status: "fixture" }],
        path.join(directory, "out"),
      ),
    ).rejects.toThrow("Missing package-qualified availability");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
