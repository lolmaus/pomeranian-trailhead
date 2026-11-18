import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { files } from "./html-links.mts";

export async function canonicalReference(
  directory: string,
  expected: Map<string, string>,
  mode: "check" | "refresh",
): Promise<Map<string, string>> {
  const paths = new Set<string>();
  for (const [name, text] of expected) {
    const folded = name.toLowerCase();
    if (
      !name.endsWith(".md") ||
      name.startsWith("/") ||
      name.includes("\\") ||
      name.split("/").some((part) => !part || part === "." || part === "..") ||
      paths.has(folded) ||
      !text.trim()
    ) {
      throw new Error(`Invalid canonical reference path or content: ${name}`);
    }
    paths.add(folded);
  }
  const actual = new Map<string, string>();
  for (const filename of await files(directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  }))
    actual.set(
      path.relative(directory, filename).split(path.sep).join("/"),
      await readFile(filename, "utf8"),
    );
  const changes: string[] = [];
  for (const [name, text] of expected) {
    if (!actual.has(name)) changes.push(`missing: ${name}`);
    else if (actual.get(name) !== text) changes.push(`changed: ${name}`);
  }
  for (const name of actual.keys()) if (!expected.has(name)) changes.push(`surplus: ${name}`);
  if (changes.length && mode === "refresh") {
    for (const [name, text] of expected) {
      if (actual.get(name) === text) continue;
      const target = path.join(directory, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, text, "utf8");
    }
    for (const name of actual.keys()) if (!expected.has(name)) await rm(path.join(directory, name));
    return new Map(expected);
  }
  if (changes.length)
    throw new Error(`Stale canonical API Markdown; run pnpm docs:generate.\n${changes.join("\n")}`);
  return actual;
}
