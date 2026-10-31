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
const forwarded = process.argv.slice(2);
// Dry runs report the complete selection in one JSON document. Real runs keep
// lightweight checks parallel and bound memory by running browser suites serially.
const phases = forwarded.some((argument) => argument.startsWith("--dry"))
  ? [["lint", "typecheck", "test", "test:stories"]]
  : [
      ["lint", "typecheck"],
      ["test", "test:stories", "--concurrency=1"],
    ];
for (const tasks of phases) {
  const result = spawnSync(
    "pnpm",
    ["exec", "turbo", "run", ...tasks, ...(affected ? ["--affected"] : []), ...forwarded],
    {
      stdio: "inherit",
      env: { ...process.env, ...(affected ? { TURBO_SCM_BASE: base, TURBO_SCM_HEAD: head } : {}) },
    },
  );
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
