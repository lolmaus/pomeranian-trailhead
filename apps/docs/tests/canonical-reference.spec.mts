import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm, writeFile, mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { canonicalReference } from "../lib/canonical-reference.mts";

test("checking canonical reference reports missing files without creating them", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pomeranian-canonical-"));
  try {
    await expect(
      canonicalReference(root, new Map([["type.md", "# Type\n"]]), "check"),
    ).rejects.toThrow("missing: type.md");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refresh rejects unsafe or colliding paths before changing any file", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pomeranian-canonical-"));
  try {
    await writeFile(path.join(root, "keep.md"), "keep");
    for (const expected of [
      new Map([["../escape.md", "bad"]]),
      new Map([
        ["Box.md", "one"],
        ["box.md", "two"],
      ]),
      new Map([["page.md", ""]]),
    ]) {
      await expect(canonicalReference(root, expected, "refresh")).rejects.toThrow(
        "Invalid canonical",
      );
      expect(await readFile(path.join(root, "keep.md"), "utf8")).toBe("keep");
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("repeated refresh is byte stable and does not touch unchanged files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pomeranian-canonical-"));
  try {
    const expected = new Map([["page.md", "# Page\n"]]);
    await canonicalReference(root, expected, "refresh");
    const before = (await stat(path.join(root, "page.md"))).mtimeMs;
    await canonicalReference(root, expected, "refresh");
    expect((await stat(path.join(root, "page.md"))).mtimeMs).toBe(before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("explicit refresh replaces stale files and checking remains read-only", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pomeranian-canonical-"));
  try {
    await writeFile(path.join(root, "old.md"), "obsolete");
    await mkdir(path.join(root, "types"));
    await writeFile(path.join(root, "types/box.md"), "stale");
    const expected = new Map([["types/box.md", "# Box\n"]]);
    await expect(canonicalReference(root, expected, "check")).rejects.toThrow(
      "changed: types/box.md",
    );
    expect(await readFile(path.join(root, "types/box.md"), "utf8")).toBe("stale");
    await canonicalReference(root, expected, "refresh");
    expect(await canonicalReference(root, expected, "check")).toEqual(expected);
    await expect(readFile(path.join(root, "old.md"))).rejects.toThrow();
    await writeFile(path.join(root, "extra.md"), "extra");
    await expect(canonicalReference(root, expected, "check")).rejects.toThrow("surplus: extra.md");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
