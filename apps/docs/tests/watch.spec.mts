import { test, expect } from "@playwright/test";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import { docsRoot, repoRoot } from "../lib/prepare.mts";

test("live preview regenerates API changes, exposes failures and recovers", async () => {
  test.setTimeout(100_000);
  const root = await mkdtemp(path.join(tmpdir(), "pomeranian-watch-"));
  const ignored = new Set([
    "node_modules",
    ".generated",
    ".turbo",
    "test-results",
    "playwright-report",
  ]);
  for (const name of [
    "apps/docs",
    "packages/test-support",
    "packages/core/prototypes/factory-typing",
  ]) {
    await cp(path.join(repoRoot, name), path.join(root, name), {
      recursive: true,
      filter: (filename) => !ignored.has(path.basename(filename)),
    });
  }
  await cp(path.join(repoRoot, "package.json"), path.join(root, "package.json"));
  await cp(path.join(repoRoot, ".gitignore"), path.join(root, ".gitignore"));
  await symlink(path.join(repoRoot, "node_modules"), path.join(root, "node_modules"), "dir");
  for (const name of ["apps/docs", "packages/test-support"])
    await symlink(
      path.join(repoRoot, name, "node_modules"),
      path.join(root, name, "node_modules"),
      "dir",
    );
  execFileSync("git", ["-C", root, "init", "-b", "main"], { stdio: "ignore" });
  execFileSync("git", ["-C", root, "config", "user.name", "Docs regression"]);
  execFileSync("git", ["-C", root, "config", "user.email", "docs@example.invalid"]);
  execFileSync("git", [
    "-C",
    root,
    "remote",
    "add",
    "origin",
    "https://github.com/lolmaus/pomeranian-trailhead.git",
  ]);
  execFileSync("git", ["-C", root, "add", "apps", "packages", "package.json", ".gitignore"]);
  execFileSync("git", ["-C", root, "commit", "-m", "test: initialize watch fixture"], {
    stdio: "ignore",
  });
  const output = path.join(root, "apps/docs/.generated");
  await mkdir(output, { recursive: true });
  const child = spawn(
    process.execPath,
    [path.join(root, "apps/docs/lib/cli.mts"), "dev", "--host", "127.0.0.1", "--port", "0"],
    { cwd: path.join(root, "apps/docs"), stdio: ["ignore", "pipe", "pipe"] },
  );
  let log = "";
  child.stdout.on("data", (data: Buffer) => {
    log += data.toString();
  });
  child.stderr.on("data", (data: Buffer) => {
    log += data.toString();
  });
  let exited = false;
  const exit = new Promise<void>((resolve) =>
    child.once("close", () => {
      exited = true;
      resolve();
    }),
  );
  try {
    await expect
      .poll(
        async () => {
          if (exited) throw new Error(log);
          return readFile(path.join(output, "ready.json"), "utf8").then(
            () => true,
            () => false,
          );
        },
        { timeout: 25_000 },
      )
      .toBe(true);
    const sourceFile = path.join(root, "packages/test-support/src/config.mts");
    const original = await readFile(sourceFile, "utf8");
    await writeFile(sourceFile, original.replace("@since @repo/test-support@Unreleased", ""));
    await expect.poll(() => log, { timeout: 25_000 }).toContain("Regeneration failed");
    expect(
      await readFile(path.join(output, "ready.json"), "utf8").then(
        () => true,
        () => false,
      ),
    ).toBe(false);
    await writeFile(
      sourceFile,
      original.replace("Framework-independent Chromium", "Recovered live Chromium"),
    );
    await expect
      .poll(
        async () =>
          readFile(
            path.join(output, "site/reference/development/variables/testConfig.md"),
            "utf8",
          ).catch(() => ""),
        { timeout: 25_000 },
      )
      .toContain("Recovered live Chromium");
    await expect
      .poll(
        async () =>
          readFile(path.join(output, "ready.json"), "utf8").then(
            () => true,
            () => false,
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
  } finally {
    child.kill("SIGTERM");
    const ended = await Promise.race([
      exit.then(() => true),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);
    if (!ended) {
      child.kill("SIGKILL");
      await exit;
    }
    await rm(root, { recursive: true, force: true });
  }
  void docsRoot;
});
