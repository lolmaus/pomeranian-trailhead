import { test, expect } from "@playwright/test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { checkHtml } from "../lib/html-links.mts";

test("checks built HTML paths and decoded anchors including navigation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "pomeranian-html-"));
  try {
    await mkdir(path.join(directory, "guide"));
    await writeFile(
      path.join(directory, "index.html"),
      '<nav><a href="guide/?search=test#r%C3%A9sum%C3%A9">Guide</a></nav>',
    );
    await writeFile(
      path.join(directory, "guide/index.html"),
      '<h1 id="résumé">Guide</h1><a href="#résumé">Self</a>',
    );
    expect(await checkHtml(directory)).toBe(2);
    await writeFile(
      path.join(directory, "index.html"),
      '<nav><a href="guide/#missing">Broken navigation</a></nav>',
    );
    await expect(checkHtml(directory)).rejects.toThrow("missing");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
