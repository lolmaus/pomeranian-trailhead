// Throwaway runner: use installed workspace dependencies without adding a package.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAuthoring } from "./authoring-checks.mjs";

const source = dirname(fileURLToPath(import.meta.url));
const repo = resolve(source, "../../../..");
const scratch = mkdtempSync(join(tmpdir(), "pomeranian-factory-proof-"));
const dependencies = join(repo, "packages/test-support/node_modules");

for (const file of [
  "probe.mts",
  "contracts.mts",
  "counterexamples.mts",
  "constructor-counterexamples.mts",
  "constructor-counterexamples.spec.mts",
  "examples.spec.mts",
  "tsconfig.json",
  "playwright.config.mts",
  "authoring-plugin.mjs",
  "authoring.oxlint.json",
]) {
  cpSync(join(source, file), join(scratch, file));
}
symlinkSync(dependencies, join(scratch, "node_modules"), "dir");
try {
  checkAuthoring(repo, scratch);
} catch (error) {
  console.error(`Authoring proof failed; scratch files: ${scratch}`);
  throw error;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: scratch, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`Proof failed; scratch files and reports: ${scratch}`);
    process.exit(result.status ?? 1);
  }
}

run(join(repo, "node_modules/.bin/tsc"), ["--project", join(scratch, "tsconfig.json")]);
console.log("Strict assertions passed, including documented counterexamples.");
if (!process.argv.includes("--types-only")) {
  run(process.execPath, [
    join(dependencies, "@playwright/test/cli.js"),
    "test",
    "--config",
    join(scratch, "playwright.config.mts"),
  ]);
}
rmSync(scratch, { recursive: true, force: true });
