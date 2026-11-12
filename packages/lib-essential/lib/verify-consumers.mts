import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const essential = fileURLToPath(new URL("..", import.meta.url));
const core = path.resolve(essential, "../core");
const scratch = await mkdtemp(path.join(tmpdir(), "pomeranian-packed-consumers-"));
function run(command: string, args: string[], cwd: string) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 240_000,
    });
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    throw new Error(
      `${command} ${args.join(" ")} in ${cwd}\n${failure.stdout ?? ""}\n${failure.stderr ?? ""}`,
      { cause: error },
    );
  }
}
async function json(filename: string, value: unknown) {
  await writeFile(filename, JSON.stringify(value, null, 2) + "\n");
}
async function files(directory: string): Promise<string[]> {
  return (
    await Promise.all(
      (await readdir(directory, { withFileTypes: true })).map(async (entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? files(target) : [target];
      }),
    )
  ).flat();
}
const compilerOptions = {
  target: "ES2022",
  module: "NodeNext",
  moduleResolution: "NodeNext",
  strict: true,
  noImplicitOverride: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
  lib: ["ESNext", "DOM"],
  types: ["node"],
  skipLibCheck: false,
};
try {
  // Build is deliberately required before packing; CI owns that dependency.
  run("pnpm", ["pack", "--pack-destination", scratch], core);
  run("pnpm", ["pack", "--pack-destination", scratch], essential);
  const tarball = (await readdir(scratch)).find(
    (name) => name.includes("lib-essential") && name.endsWith(".tgz"),
  );
  assert(tarball, "pnpm pack must produce an actual tarball");
  const packed = path.join(scratch, tarball);
  const payload = run("tar", ["-tzf", packed], scratch).trim().split("\n");
  assert(payload.some((name) => name === "package/src/element.ts"));
  for (const module of ["index", "element"]) {
    for (const suffix of ["js", "mjs", "d.ts", "js.map", "d.ts.map"])
      assert(
        payload.includes(`package/dist/${module}.${suffix}`),
        `missing published output ${module}.${suffix}`,
      );
    assert(payload.includes(`package/src/${module}.ts`), `missing included source ${module}`);
  }
  assert(
    !payload.some((name) => /\/(tests|prototypes|lib)\//.test(name)),
    "development fixtures must not ship",
  );
  const extract = path.join(scratch, "payload");
  await mkdir(extract);
  run("tar", ["-xzf", packed, "-C", extract], scratch);
  const packageRoot = path.join(extract, "package");
  for (const filename of (await files(packageRoot)).filter((name) => name.endsWith(".map"))) {
    const map = JSON.parse(await readFile(filename, "utf8")) as {
      sourceRoot?: string;
      sources: string[];
    };
    assert(map.sources.length, `map has sources: ${filename}`);
    for (const source of map.sources) {
      const target = path.resolve(path.dirname(filename), map.sourceRoot ?? "", source);
      assert(target.startsWith(packageRoot + path.sep), `map source stays in payload: ${target}`);
      await readFile(target);
    }
  }
  for (const style of ["runner", "standalone"] as const) {
    const directory = path.join(scratch, style);
    await mkdir(directory);
    await writeFile(
      path.join(directory, ".npmrc"),
      "auto-install-peers=false\nstrict-peer-dependencies=true\nnode-linker=isolated\n",
    );
    await json(path.join(directory, "package.json"), {
      name: `consumer-${style}`,
      version: "1.0.0",
      private: true,
      type: "module",
      dependencies: {
        "@pomeranian/lib-essential": `file:${packed}`,
        "@pomeranian/core": `file:${path.join(
          scratch,
          (await readdir(scratch)).find((n) => n.startsWith("pomeranian-core-"))!,
        )}`,
        "playwright-core": "1.64.1",
        [style === "runner" ? "@playwright/test" : "playwright"]: "1.64.1",
      },
      devDependencies: {
        typescript: "7.0.2",
        "typescript-minimum": "npm:typescript@6.0.3",
        "@types/node": "26.6.5",
      },
    });
    run("pnpm", ["install", "--ignore-scripts"], directory);
    if (style === "standalone") {
      const installed = await readdir(path.join(directory, "node_modules/.pnpm"));
      assert(
        !installed.some((name) => name.startsWith("@playwright+test@")),
        "standalone physical dependency graph excludes runner",
      );
      assert.throws(
        () => run(process.execPath, ["-e", "require.resolve('@playwright/test')"], directory),
        "standalone must not resolve test runner",
      );
    }
    const library = path.join(directory, "library");
    await mkdir(library);
    await writeFile(
      path.join(library, "index.ts"),
      await readFile(path.join(essential, "tests/consumers/library.ts.txt"), "utf8"),
    );
    await json(path.join(library, "package.json"), {
      name: "@fixture/library",
      version: "0.1.0",
      type: "commonjs",
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      files: ["dist"],
      peerDependencies: {
        "@pomeranian/core": "^0.1.0",
        "@pomeranian/lib-essential": "^0.1.0",
        "playwright-core": ">=1.64.1 <2",
      },
    });
    await json(path.join(library, "tsconfig.json"), {
      compilerOptions: { ...compilerOptions, declaration: true, outDir: "dist" },
      include: ["index.ts"],
    });
    run(
      process.execPath,
      [
        path.join(directory, "node_modules/typescript/bin/tsc"),
        "-p",
        path.join(library, "tsconfig.json"),
      ],
      directory,
    );
    run("pnpm", ["pack", "--pack-destination", directory], library);
    run("pnpm", ["add", "./fixture-library-0.1.0.tgz", "--ignore-scripts"], directory);
    const contract = await readFile(
      path.join(essential, "tests/consumers/contracts.ts.txt"),
      "utf8",
    );
    for (const extension of ["mts", "cts"])
      await writeFile(path.join(directory, `contracts.${extension}`), contract);
    for (const compiler of ["typescript-minimum", "typescript"]) {
      for (const module of ["NodeNext", "Node16"]) {
        await json(path.join(directory, "tsconfig.json"), {
          compilerOptions: { ...compilerOptions, module, moduleResolution: module, noEmit: true },
          include: ["contracts.mts", "contracts.cts"],
        });
        run(
          process.execPath,
          [
            path.join(directory, `node_modules/${compiler}/bin/tsc`),
            "-p",
            path.join(directory, "tsconfig.json"),
          ],
          directory,
        );
      }
    }
    // Isolated process proves direct imports do not evaluate the aggregate or DOM module.
    await writeFile(
      path.join(directory, "isolation.cjs"),
      `const assert=require('node:assert/strict');require('@pomeranian/core/page-object');const loaded=Object.keys(require.cache);assert(!loaded.some(p=>/core[\\/]dist[\\/](index|dom-page-object)\\.js$/.test(p)));`,
    );
    run(process.execPath, ["isolation.cjs"], directory);
    await writeFile(
      path.join(directory, "isolation.mjs"),
      `import assert from 'node:assert/strict';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);await import('@pomeranian/core/page-object');assert(!Object.keys(require.cache).some(p=>p.endsWith('/dist/index.js')||p.endsWith('/dist/dom-page-object.js')));`,
    );
    run(process.execPath, ["isolation.mjs"], directory);
    await writeFile(
      path.join(directory, "runtime.mjs"),
      `
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as esm from '@pomeranian/lib-essential';
import {DomPageObject as Direct} from '@pomeranian/core/dom-page-object';
import {PageObject as Group} from '@pomeranian/core/page-object';
import {defaultInstanceType as directSymbol} from '@pomeranian/core/authoring';
import {LibraryButton} from '@fixture/library';
import {chromium} from '${style === "runner" ? "@playwright/test" : "playwright"}';
const require=createRequire(import.meta.url), cjs=require('@pomeranian/lib-essential');
const direct=await import('@pomeranian/lib-essential/element');assert.equal(direct.Element,esm.Element);assert.equal(require('@pomeranian/lib-essential/element').Element,esm.Element);
assert.equal(esm.Element,cjs.Element);assert(esm.Element.prototype instanceof Direct);
for(const subpath of ['src/element.ts','dist/element.js']) assert.throws(()=>require('@pomeranian/lib-essential/'+subpath),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
const browser=await chromium.launch();
try {const context=await browser.newContext();try {const page=await context.newPage();await page.setContent('<button>Ready</button>');const button=LibraryButton.create(page);assert(button instanceof Direct);assert.equal(button.root,null);await button.click();assert.equal(await button.locator.textContent(),'Ready');assert.equal(button.locator,button.locator);await page.setContent('<button>Live</button>');assert.equal(await button.locator.textContent(),'Live');}finally{await context.close();}}finally{await browser.close();}
`,
    );
    run(process.execPath, ["runtime.mjs"], directory);
    console.log(
      `${style}: actual tarballs, strict peers, TypeScript 6.0.3/7.0.2 × NodeNext/Node16 × mts/cts, identities, exports, Chromium passed`,
    );
  }
  console.log(
    "Playwright minimum/current tested: 1.64.1 (repository current pin equals minimum). No Node-version matrix or publication performed.",
  );
  await rm(scratch, { recursive: true, force: true });
} catch (error) {
  console.error(`Consumer evidence retained at ${scratch}`);
  throw error;
}
