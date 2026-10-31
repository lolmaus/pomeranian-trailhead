import { test, expect } from "@playwright/test";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { docsRoot } from "../lib/prepare.mts";

test("build command creates the actual static artifact and shared model", async () => {
  test.setTimeout(90_000);
  await mkdir(path.join(docsRoot, ".generated"), { recursive: true });
  const output = await mkdtemp(path.join(docsRoot, ".generated/command-"));
  try {
    const result = spawnSync(
      process.execPath,
      [path.join(docsRoot, "lib/cli.mts"), "build", "--out", output],
      { encoding: "utf8", timeout: 80_000 },
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(
      await access(path.join(output, "site/.vitepress/dist/index.html")).then(
        () => true,
        () => false,
      ),
    ).toBe(true);
    await access(path.join(output, "content-model.json"));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
