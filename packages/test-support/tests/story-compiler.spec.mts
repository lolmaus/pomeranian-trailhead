import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

const owner = fileURLToPath(new URL("../", import.meta.url));
const prelude =
  'import { typedStories } from "../../src/stories.mts";\nimport type { Page } from "@playwright/test";\nconst options={baseURL:"http://localhost",ready:(p:Page)=>p.locator("button")};\n';
for (const [name, body, diagnostic] of [
  [
    "valid",
    'typedStories<typeof import("../fixtures/counter.stories.tsx")>("HTML/Counter",options);',
    undefined,
  ],
  [
    "wrong title",
    'typedStories<typeof import("../fixtures/counter.stories.tsx")>("Wrong",options);',
    "TS2345",
  ],
  [
    "renamed export",
    'const open=typedStories<typeof import("../fixtures/counter.stories.tsx")>("HTML/Counter",options);declare const p:Page;void open(p,"Renamed");',
    "TS2345",
  ],
  [
    "missing module",
    'typedStories<typeof import("../fixtures/missing.stories.tsx")>("HTML/Counter",options);',
    "TS2307",
  ],
  [
    "widened title",
    'typedStories<{default:{title:string};Primary:object}>("Anything",options);',
    "TS2345",
  ],
  [
    "optional title",
    'typedStories<{default:{title?:"Actual"};Primary:object}>("Actual",options);',
    "TS2345",
  ],
  ["absent title", 'typedStories<{default:object;Primary:object}>("Actual",options);', "TS2345"],
] as const) {
  test(`real compiler story contract: ${name}`, () => {
    const dir = mkdtempSync(join(owner, "tests/.compiler-"));
    try {
      writeFileSync(join(dir, "case.mts"), prelude + body);
      writeFileSync(
        join(dir, "tsconfig.json"),
        JSON.stringify({ extends: "../../tsconfig.story-tests.json", include: ["case.mts"] }),
      );
      const result = spawnSync("pnpm", ["exec", "tsc", "-p", join(dir, "tsconfig.json")], {
        cwd: owner,
        encoding: "utf8",
        timeout: 20000,
      });
      const output = result.stdout + result.stderr;
      if (diagnostic) {
        expect(result.status, output).not.toBe(0);
        expect(output).toContain(diagnostic);
      } else expect(result.status, output).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
