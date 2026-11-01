// THROWAWAY #10: use installed dependencies; install nothing.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = dirname(fileURLToPath(import.meta.url));
const repo = resolve(source, "../../../..");
const scratch = mkdtempSync(join(tmpdir(), "pomeranian-target-proof-"));
const dependencies = join(repo, "packages/test-support/node_modules");
for (const file of [
  "probe.mts",
  "contracts.mts",
  "examples.spec.mts",
  "tsconfig.json",
  "playwright.config.mts",
]) {
  cpSync(join(source, file), join(scratch, file));
}
symlinkSync(dependencies, join(scratch, "node_modules"), "dir");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: scratch, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`Proof failed; scratch files and reports: ${scratch}`);
    process.exit(result.status ?? 1);
  }
}

run(join(repo, "node_modules/.bin/tsc"), ["--project", join(scratch, "tsconfig.json")]);
console.log("Strict target-contract types passed.");
if (!process.argv.includes("--types-only")) {
  run(process.execPath, [
    join(dependencies, "@playwright/test/cli.js"),
    "test",
    "--config",
    join(scratch, "playwright.config.mts"),
    ...process.argv.slice(2),
  ]);
}
rmSync(scratch, { recursive: true, force: true });
