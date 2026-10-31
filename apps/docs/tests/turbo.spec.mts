import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { repoRoot } from "../lib/prepare.mts";

interface DryRun {
  tasks: { taskId: string; command: string; hash: string }[];
}

test("actual Turbo graph selects docs for source changes and invalidates its build", () => {
  test.setTimeout(60_000);
  const root = mkdtempSync(path.join(tmpdir(), "pomeranian-docs-turbo-"));
  const env = {
    ...process.env,
    PATH: `${path.join(repoRoot, "node_modules/.bin")}${path.delimiter}${process.env["PATH"] ?? ""}`,
    TURBO_TELEMETRY_DISABLED: "1",
  };
  function run(command: string, args: string[], extra: Record<string, string> = {}) {
    return execFileSync(command, args, {
      cwd: root,
      env: { ...env, ...extra },
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
  function write(name: string, value: string) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), value);
  }
  function commit() {
    run("git", [
      "add",
      "apps",
      "packages",
      "lib",
      "package.json",
      "pnpm-workspace.yaml",
      "pnpm-lock.yaml",
      "turbo.json",
      ".gitignore",
    ]);
    run("git", [
      "-c",
      "user.name=Docs",
      "-c",
      "user.email=docs@example.invalid",
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "-m",
      "test: update fixture",
    ]);
    return run("git", ["rev-parse", "HEAD"]).trim();
  }
  function selected(base: string, head: string) {
    const report = JSON.parse(
      run(process.execPath, [path.join(root, "lib/ci.mts"), "--dry=json"], {
        CI_BASE_SHA: base,
        CI_HEAD_SHA: head,
      }),
    ) as DryRun;
    return report.tasks
      .filter((task) => task.taskId.endsWith("#test") && task.command !== "<NONEXISTENT>")
      .map((task) => task.taskId.split("#")[0])
      .sort();
  }
  function buildHash() {
    const report = JSON.parse(
      run("pnpm", ["exec", "turbo", "run", "build", "--filter=@repo/docs", "--dry=json"]),
    ) as DryRun;
    return report.tasks.find((task) => task.taskId === "@repo/docs#build")?.hash;
  }
  try {
    run("git", ["init", "--initial-branch=main"]);
    write(
      "package.json",
      JSON.stringify({ name: "docs-graph-fixture", private: true, packageManager: "pnpm@12.15.0" }),
    );
    write("pnpm-workspace.yaml", "packages:\n  - apps/*\n  - packages/*\n");
    write(".gitignore", "node_modules/\n.turbo/\n");
    write("turbo.json", readFileSync(path.join(repoRoot, "turbo.json"), "utf8"));
    write("lib/ci.mts", readFileSync(path.join(repoRoot, "lib/ci.mts"), "utf8"));
    const actual = JSON.parse(
      readFileSync(path.join(repoRoot, "apps/docs/package.json"), "utf8"),
    ) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const dependencies = Object.fromEntries(
      Object.entries({ ...actual.dependencies, ...actual.devDependencies }).filter(([, value]) =>
        value.startsWith("workspace:"),
      ),
    );
    expect(dependencies["@repo/test-support"]).toBe("workspace:*");
    let lock = "lockfileVersion: '9.0'\nimporters:\n  .: {}\n";
    for (const [directory, name] of [
      ["apps/docs", "@repo/docs"],
      ["packages/test-support", "@repo/test-support"],
      ["packages/typescript-config", "@repo/typescript-config"],
      ["packages/oxlint-config", "@repo/oxlint-config"],
      ["packages/unrelated", "@fixture/unrelated"],
    ]) {
      if (!directory || !name) throw new Error("Invalid workspace fixture");
      write(
        `${directory}/package.json`,
        JSON.stringify({
          name,
          private: true,
          scripts: {
            lint: "node -e '0'",
            typecheck: "node -e '0'",
            build: "node -e '0'",
            test: "node -e '0'",
          },
          ...(name === "@repo/docs" ? { dependencies } : {}),
        }),
      );
      write(`${directory}/source.mts`, "export const value = 1;\n");
      lock += `  ${directory}:`;
      if (name === "@repo/docs") {
        lock += "\n    dependencies:\n";
        for (const dependency of Object.keys(dependencies))
          lock += `      '${dependency}':\n        specifier: workspace:*\n        version: link:../../packages/${dependency.split("/")[1]}\n`;
      } else lock += " {}\n";
    }
    write("packages/core/prototypes/factory-typing/probe.mts", "export const prototype = 1;\n");
    write("pnpm-lock.yaml", lock);
    run("pnpm", ["exec", "turbo", "--version"]);
    const base = commit();
    const before = buildHash();
    write("packages/test-support/source.mts", "export const value = 2;\n");
    const support = commit();
    expect(selected(base, support)).toEqual(["@repo/docs", "@repo/test-support"]);
    expect(before).toBeDefined();
    expect(buildHash()).not.toBe(before);
    write("packages/unrelated/source.mts", "export const value = 2;\n");
    const unrelated = commit();
    expect(selected(support, unrelated)).toEqual(["@fixture/unrelated"]);
    const beforePrototype = buildHash();
    write("packages/core/prototypes/factory-typing/probe.mts", "export const prototype = 2;\n");
    const prototype = commit();
    expect(selected(unrelated, prototype)).toContain("@repo/docs");
    expect(buildHash()).not.toBe(beforePrototype);
    expect(selected("f".repeat(40), prototype)).toContain("@repo/docs");
    expect(selected("f".repeat(40), prototype)).toContain("@fixture/unrelated");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
