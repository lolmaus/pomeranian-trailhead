import { expect, test } from "@playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reference, type Source } from "../lib/reference.mts";

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
