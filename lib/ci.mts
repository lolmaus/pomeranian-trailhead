import { spawnSync } from "node:child_process";

const base = process.env["CI_BASE_SHA"];
const head = process.env["CI_HEAD_SHA"];
function git(args: string[]) {
  return spawnSync("git", args, { encoding: "utf8" });
}

function comparisonProblem() {
  if (!base || !head) return "comparison SHA not supplied";
  if (![base, head].every((sha) => /^[\da-f]{40}$/i.test(sha) && !/^0+$/.test(sha))) {
    return "comparison SHA is invalid or all zeros";
  }
  if ([base, head].some((sha) => git(["cat-file", "-e", `${sha}^{commit}`]).status !== 0)) {
    return "comparison commit is unavailable";
  }
  if (git(["rev-parse", "HEAD"]).stdout.trim() !== head.toLowerCase()) {
    return "comparison head does not match the checkout";
  }
  if (git(["merge-base", "--is-ancestor", base, head]).status !== 0) {
    return "comparison base is not an ancestor of the checkout";
  }
  return undefined;
}

const problem = comparisonProblem();
const affected = problem === undefined;
console.error(
  affected
    ? "CI: checking affected packages and their dependencies"
    : `CI: checking full workspace (${problem})`,
);
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "turbo",
    "run",
    "lint",
    "typecheck",
    "test",
    ...(affected ? ["--affected"] : []),
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, ...(affected ? { TURBO_SCM_BASE: base, TURBO_SCM_HEAD: head } : {}) },
  },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
