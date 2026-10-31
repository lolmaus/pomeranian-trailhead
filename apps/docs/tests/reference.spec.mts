import { expect, test } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
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
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
