import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { prepare } from "../lib/prepare.mts";

test("builds site inputs and shared model from actual comments and checked guide sources", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "pomeranian-content-"));
  try {
    const model = await prepare(output);
    expect(model.pages.some((page) => page.path === "getting-started.md")).toBe(true);
    expect(
      model.pages.find((page) => page.path === "getting-started.md")?.document.examples,
    ).toEqual([expect.objectContaining({ path: "examples/inline.spec.mts", region: "scenario" })]);
    expect(model.api?.symbols.map((symbol) => symbol.name)).toEqual(["testConfig"]);
    expect(await readFile(path.join(model.site, "guides/testing.md"), "utf8")).toContain(
      "export const exampleConfig",
    );
    expect(
      await readFile(path.join(model.site, "reference/prototype-helpers.md"), "utf8"),
    ).toContain("type TargetArguments<Instance>");
    expect(await readFile(path.join(output, "content-model.json"), "utf8")).toContain(
      "ownerByReflection",
    );
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
