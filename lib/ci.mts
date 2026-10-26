import { spawnSync } from "node:child_process";

const base = process.env["CI_BASE_SHA"];
const head = process.env["CI_HEAD_SHA"];
const affected = Boolean(base && head);
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
