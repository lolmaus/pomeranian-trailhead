import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test as base } from "@playwright/test";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const ci = join(repo, "lib/ci.mts");
const names = ["support", "feature", "consumer", "unrelated"];

function command(cwd: string, executable: string, args: string[], env = process.env) {
  const result = spawnSync(executable, args, {
    cwd,
    env,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `${executable} ${args.join(" ")} failed: ${result.error?.message ?? ""}\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result;
}

function write(root: string, path: string, content: string) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function commit(root: string) {
  command(root, "git", ["add", "--all"]);
  command(root, "git", [
    "-c",
    "user.name=Harness",
    "-c",
    "user.email=harness@example.invalid",
    "-c",
    "core.hooksPath=/dev/null",
    "commit",
    "-m",
    "fixture",
  ]);
  return command(root, "git", ["rev-parse", "HEAD"]).stdout.trim();
}

const test = base.extend<{ workspace: { root: string; baseSha: string } }>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires a destructured fixture parameter.
  workspace: async ({}, use) => {
    const root = mkdtempSync(join(tmpdir(), "pomeranian-ci-"));
    try {
      command(root, "git", ["init", "--initial-branch=main"]);
      write(
        root,
        "package.json",
        JSON.stringify({
          name: "selection-fixture",
          private: true,
          packageManager: "pnpm@12.15.0",
        }),
      );
      write(root, ".gitignore", "node_modules/\n.turbo/\n");
      write(root, "pnpm-workspace.yaml", "packages:\n  - packages/*\n");
      write(root, "turbo.json", readFileSync(join(repo, "turbo.json"), "utf8"));
      write(root, "lib/ci.mts", readFileSync(ci, "utf8"));
      let lock = "lockfileVersion: '9.0'\nimporters:\n  .: {}\n";
      for (const name of names) {
        const dependency =
          name === "feature" ? "support" : name === "consumer" ? "feature" : undefined;
        write(
          root,
          `packages/${name}/package.json`,
          JSON.stringify({
            name: `@fixture/${name}`,
            version: "0.0.0",
            private: true,
            scripts: { lint: 'node -e "0"', typecheck: 'node -e "0"', test: 'node -e "0"' },
            devDependencies: {
              "@fixture/typescript-config": "workspace:*",
              ...(dependency ? { [`@fixture/${dependency}`]: "workspace:*" } : {}),
            },
          }),
        );
        write(root, `packages/${name}/index.mts`, "export const value = 1;\n");
        lock += `  packages/${name}:\n    devDependencies:\n      '@fixture/typescript-config':\n        specifier: workspace:*\n        version: link:../typescript-config\n`;
        if (dependency)
          lock += `      '@fixture/${dependency}':\n        specifier: workspace:*\n        version: link:../${dependency}\n`;
      }
      write(root, "packages/typescript-config/tsconfig.base.json", "{}\n");
      write(
        root,
        "packages/typescript-config/package.json",
        JSON.stringify({ name: "@fixture/typescript-config", private: true }),
      );
      lock += "  packages/typescript-config: {}\n";
      write(root, "pnpm-lock.yaml", lock);
      // pnpm 12 records its own package-manager lock section on first invocation.
      // Normalize that before the baseline so it is not an unrelated root change.
      command(root, "pnpm", ["exec", "turbo", "--version"], {
        ...process.env,
        PATH: `${join(repo, "node_modules/.bin")}${delimiter}${process.env["PATH"] ?? ""}`,
      });
      await use({ root, baseSha: commit(root) });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
});

interface DryRun {
  tasks: { taskId: string; command: string; hash: string; inputs: Record<string, string> }[];
}

function selected(root: string, baseSha: string, headSha: string) {
  const result = command(root, process.execPath, [join(root, "lib/ci.mts"), "--dry=json"], {
    ...process.env,
    PATH: `${join(repo, "node_modules/.bin")}${delimiter}${process.env["PATH"] ?? ""}`,
    CI_BASE_SHA: baseSha,
    CI_HEAD_SHA: headSha,
    TURBO_TELEMETRY_DISABLED: "1",
  });
  const report = JSON.parse(result.stdout) as DryRun;
  return {
    report,
    stderr: result.stderr,
    packages: [
      ...new Set(
        report.tasks
          .filter((task) => task.command !== "<NONEXISTENT>" && task.taskId.endsWith("#test"))
          .map((task) => task.taskId.split("#")[0]),
      ),
    ].sort(),
  };
}

test("package changes select dependents without unrelated packages", async ({ workspace }) => {
  write(workspace.root, "packages/feature/index.mts", "export const value = 2;\n");
  const head = commit(workspace.root);
  const selection = selected(workspace.root, workspace.baseSha, head);
  expect(selection.packages, selection.stderr).toEqual(["@fixture/consumer", "@fixture/feature"]);
});

test("an unavailable comparison base falls back to all package tests", async ({ workspace }) => {
  const selection = selected(workspace.root, "f".repeat(40), workspace.baseSha);
  expect(selection.packages).toEqual(names.map((name) => `@fixture/${name}`).sort());
  expect(selection.stderr).toContain("full workspace");
});

test("shared support changes select every dependent and exclude unrelated tests", async ({
  workspace,
}) => {
  write(workspace.root, "packages/support/index.mts", "export const value = 2;\n");
  const selection = selected(workspace.root, workspace.baseSha, commit(workspace.root));
  expect(selection.packages).toEqual(["@fixture/consumer", "@fixture/feature", "@fixture/support"]);
  expect(selection.stderr).toContain("affected packages");
});

test("shared TypeScript configuration invalidates every package", async ({ workspace }) => {
  const before = selected(workspace.root, "", "").report.tasks.find(
    (task) => task.taskId === "@fixture/unrelated#test",
  )?.hash;
  write(
    workspace.root,
    "packages/typescript-config/tsconfig.base.json",
    '{"compilerOptions":{"strict":true}}\n',
  );
  const selection = selected(workspace.root, workspace.baseSha, commit(workspace.root));
  expect(selection.packages).toEqual(names.map((name) => `@fixture/${name}`).sort());
  expect(
    selection.report.tasks.find((task) => task.taskId === "@fixture/unrelated#test")?.hash,
  ).not.toBe(before);
});

test("generated lint logs do not change unrelated task hashes", async ({ workspace }) => {
  const before = selected(workspace.root, "", "").report.tasks.find(
    (task) => task.taskId === "@fixture/unrelated#test",
  )?.hash;
  write(workspace.root, "packages/oxlint-config/.turbo/turbo-lint.log", "generated log\n");
  const after = selected(workspace.root, "", "").report.tasks.find(
    (task) => task.taskId === "@fixture/unrelated#test",
  )?.hash;
  expect(before).toBeDefined();
  expect(after).toBe(before);
});

for (const path of [
  ".nvmrc",
  "oxlint.config.mts",
  "oxfmt.config.mts",
  "tsconfig.node.json",
  "lib/ci.mts",
  ".github/workflows/ci.yml",
]) {
  test(`root input ${path} selects the full workspace`, async ({ workspace }) => {
    write(
      workspace.root,
      path,
      path === "lib/ci.mts" ? `${readFileSync(ci, "utf8")}\n// Root input changed.\n` : "changed\n",
    );
    expect(selected(workspace.root, workspace.baseSha, commit(workspace.root)).packages).toEqual(
      names.map((name) => `@fixture/${name}`).sort(),
    );
  });
}

for (const badBase of ["", "0".repeat(40), "--not-a-revision"]) {
  test(`unsafe or absent base ${badBase || "(absent)"} uses the full workspace`, async ({
    workspace,
  }) => {
    const selection = selected(workspace.root, badBase, workspace.baseSha);
    expect(selection.packages).toEqual(names.map((name) => `@fixture/${name}`).sort());
    expect(selection.stderr).toContain("full workspace");
  });
}

test("a head that differs from the checkout cannot narrow CI", async ({ workspace }) => {
  write(workspace.root, "packages/feature/index.mts", "export const value = 2;\n");
  commit(workspace.root);
  const selection = selected(workspace.root, workspace.baseSha, workspace.baseSha);
  expect(selection.packages).toEqual(names.map((name) => `@fixture/${name}`).sort());
  expect(selection.stderr).toContain("head does not match");
});

test("a base from unrelated history cannot narrow CI", async ({ workspace }) => {
  const tree = command(workspace.root, "git", ["rev-parse", "HEAD^{tree}"]).stdout.trim();
  const unrelated = command(workspace.root, "git", [
    "-c",
    "user.name=Harness",
    "-c",
    "user.email=harness@example.invalid",
    "commit-tree",
    tree,
    "-m",
    "unrelated history",
  ]).stdout.trim();
  const selection = selected(workspace.root, unrelated, workspace.baseSha);
  expect(selection.packages).toEqual(names.map((name) => `@fixture/${name}`).sort());
  expect(selection.stderr).toContain("not an ancestor");
});

for (const path of ["tests/local.spec.mts", "playwright.config.mts"]) {
  test(`package input ${path} affects selection and the test hash`, async ({ workspace }) => {
    const before = selected(workspace.root, "", "").report.tasks.find(
      (task) => task.taskId === "@fixture/feature#test",
    )?.hash;
    write(workspace.root, `packages/feature/${path}`, "// New test input.\n");
    const selection = selected(workspace.root, workspace.baseSha, commit(workspace.root));
    expect(selection.packages).toEqual(["@fixture/consumer", "@fixture/feature"]);
    const task = selection.report.tasks.find(
      (candidate) => candidate.taskId === "@fixture/feature#test",
    );
    expect(task?.inputs[path]).toBeDefined();
    expect(task?.hash).not.toBe(before);
  });
}

for (const path of [
  "packages/lib-ant-design/tests/button.stories.tsx",
  "packages/lib-ant-design/tests/button-label.ts",
  "packages/test-support/tests/fixtures/counter.stories.tsx",
  "apps/storybook-react/.storybook/main.ts",
  "packages/test-support/src/stories.mts",
  "packages/test-support/src/story-server.mts",
  "packages/test-support/playwright.stories.config.mts",
  "packages/test-support/story-setup.mts",
]) {
  test(`external story input ${path} selects packages and changes hashes`, async ({
    workspace,
  }) => {
    const before = selected(workspace.root, "", "").report.tasks.find(
      (task) => task.taskId === "@fixture/unrelated#test",
    )?.hash;
    write(workspace.root, path, "// changed external input\n");
    const selection = selected(workspace.root, workspace.baseSha, commit(workspace.root));
    expect(selection.packages).toEqual(names.map((name) => `@fixture/${name}`).sort());
    expect(
      selection.report.tasks.find((task) => task.taskId === "@fixture/unrelated#test")?.hash,
    ).not.toBe(before);
  });
}

for (const path of [
  "apps/storybook-react/dist/index.html",
  "apps/storybook-react/.turbo/turbo-build.log",
  "packages/test-support/test-results/stories/result.json",
  "packages/test-support/playwright-report/stories/index.html",
]) {
  test(`generated story output ${path} leaves hashes unchanged`, async ({ workspace }) => {
    const before = selected(workspace.root, "", "").report.tasks.find(
      (task) => task.taskId === "@fixture/unrelated#test",
    )?.hash;
    write(workspace.root, path, "generated\n");
    const after = selected(workspace.root, "", "").report.tasks.find(
      (task) => task.taskId === "@fixture/unrelated#test",
    )?.hash;
    expect(before).toBeDefined();
    expect(after).toBe(before);
  });
}
