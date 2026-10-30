// Integration checks use the actual parser and compiler, including known unsafe
// constructor sources. A nonzero tool exit alone is insufficient: check diagnostics.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function checkAuthoring(repo, scratch) {
  const lint = (files) => {
    const result = spawnSync(
      join(repo, "node_modules/.bin/oxlint"),
      ["--config", join(scratch, "authoring.oxlint.json"), "--format", "json", ...files],
      { cwd: scratch, encoding: "utf8" },
    );
    if (result.error) throw result.error;
    const report = JSON.parse(result.stdout);
    assert.equal(report.number_of_files, files.length, "All requested sources must be checked");
    return { status: result.status, diagnostics: report.diagnostics };
  };
  const accepted = lint(["probe.mts", "contracts.mts"]);
  assert.equal(accepted.status, 0, JSON.stringify(accepted.diagnostics));
  assert.equal(accepted.diagnostics.length, 0);

  const fixture = join(scratch, "authoring-fixture.mts");
  const metadata =
    "declare readonly [defaultInstanceType]: { instance: Widget; parameters: { root: R; value: V } };";
  const check = "checkLibrary<Widget>()(Widget);";
  const good = `import { LibraryButton, App, checkLibrary, defaultInstanceType, type UnboundRoot } from './probe.mts';
class Widget<R extends UnboundRoot = UnboundRoot, V = string> extends LibraryButton<R> {
 ${metadata}
 #value: V | undefined = undefined;
 value(): V | undefined { return this.#value; }
}
${check}
class Bound extends Widget<App, number> { #count = 0; increment() { return ++this.#count; } }
`;
  const cases = [
    ["own metadata", good.replace(metadata, ""), "declare their own"],
    ["independent parameter", good.replace("; value: V", ""), "every generic parameter"],
    [
      "bare default instance",
      good.replace("instance: Widget", "instance: LibraryButton"),
      "bare class instance",
    ],
    ["conformance assertion", good.replace(check, ""), "same-scope"],
    [
      "wrong assertion",
      good.replace(check, "checkLibrary<LibraryButton>()(Widget);"),
      "same-scope",
    ],
    ["nested assertion", good.replace(check, `function unused() { ${check} }`), "same-scope"],
    [
      "suppressed assertion",
      good.replace(check, `// @ts-expect-error\n${check}`),
      "Do not suppress",
    ],
    [
      "suppressed metadata",
      good.replace(metadata, `// @ts-ignore\n${metadata}`),
      "Do not suppress",
    ],
    [
      "constructor",
      good.replace(metadata, `${metadata}\nprotected constructor(page: never) { super(page); }`),
      "inherited constructor",
    ],
    [
      "factory override",
      good.replace(metadata, `${metadata}\nstatic override create() { throw Error(); }`),
      "inherited static create",
    ],
    [
      "computed factory override",
      good.replace(metadata, `${metadata}\nstatic override ['create']() { throw Error(); }`),
      "inherited static create",
    ],
    [
      "class expression",
      good.replace("class Widget<", "const Expression = class Widget<"),
      "named class declaration",
    ],
    [
      "mixin",
      good.replace("extends LibraryButton<R>", "extends mixin(LibraryButton<R>)"),
      "named superclass",
    ],
    [
      "nested declaration",
      good.replace("class Widget<", "function scope() { class Widget<") + "\n}",
      "top-level",
    ],
    [
      "aliased superclass",
      good
        .replace("class Widget<", "const Alias = LibraryButton; class Widget<")
        .replace("extends LibraryButton<R>", "extends Alias<R>"),
      "checked superclass",
    ],
    [
      "unvalidated imported superclass",
      good
        .replace("class Widget<", "import { Base } from 'unchecked-library'; class Widget<")
        .replace("extends LibraryButton<R>", "extends Base<R>"),
      "checked superclass",
    ],
    ["file suppression", "// @ts-nocheck\n" + good, "Do not suppress"],
    [
      "constructor specialization",
      good + "\nconst specialized = Widget<App, number>;",
      "constructor instantiation",
    ],
  ];
  try {
    writeFileSync(fixture, good);
    const positive = lint([fixture]);
    assert.equal(positive.status, 0, JSON.stringify(positive.diagnostics));
    const compile = spawnSync(
      join(repo, "node_modules/.bin/tsc"),
      ["--project", join(scratch, "tsconfig.json")],
      { cwd: scratch, encoding: "utf8" },
    );
    if (compile.error) throw compile.error;
    assert.equal(compile.status, 0, compile.stdout + compile.stderr);
    for (const [name, code, message] of cases) {
      writeFileSync(fixture, code);
      const result = lint([fixture]);
      assert.equal(result.status, 1, `Mutation accepted: ${name}`);
      assert.ok(
        result.diagnostics.some(
          (item) => item.code === "factory-authoring(contract)" && item.message.includes(message),
        ),
        `Missing intended diagnostic: ${name}: ${JSON.stringify(result.diagnostics)}`,
      );
    }
    const constructors = lint(["constructor-counterexamples.mts"]);
    assert.equal(constructors.status, 1);
    assert.equal(
      constructors.diagnostics.filter((item) => item.message.includes("inherited constructor"))
        .length,
      6,
    );
    const generics = lint(["counterexamples.mts"]);
    assert.equal(generics.status, 1);
    assert.ok(generics.diagnostics.some((item) => item.message.includes("declare their own")));
    const incompatible = good
      .replace("class Widget<", "import { ValueButton } from './contracts.mts'; class Widget<")
      .replace("V = string", "V = number")
      .replace("extends LibraryButton<R>", "extends ValueButton<R, V>")
      .replaceAll("#value", "#ownValue");
    writeFileSync(fixture, incompatible);
    const numericLint = lint([fixture]);
    assert.equal(
      numericLint.status,
      0,
      `The numeric default has complete authoring metadata: ${JSON.stringify(numericLint.diagnostics)}`,
    );
    const numeric = spawnSync(
      join(repo, "node_modules/.bin/tsc"),
      ["--project", join(scratch, "tsconfig.json")],
      { cwd: scratch, encoding: "utf8" },
    );
    if (numeric.error) throw numeric.error;
    assert.notEqual(numeric.status, 0, "Unrelated inherited defaults remain unsupported");
    assert.match(
      numeric.stdout,
      /TS2416/u,
      "Require the actual inherited-property compatibility diagnostic",
    );
    console.log(
      `Authoring checks passed: valid sources, ${cases.length} mutations, both counterexample modules, and incompatible-default compiler rejection.`,
    );
  } finally {
    rmSync(fixture, { force: true });
  }
}
