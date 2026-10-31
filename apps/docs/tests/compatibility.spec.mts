import { test, expect } from "@playwright/test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import path from "node:path";
import { Application, DeclarationReflection, ReflectionKind, TSConfigReader } from "typedoc";
import evidence from "../fixtures/compatibility-evidence.json" with { type: "json" };
import { docsRoot, repoRoot } from "../lib/prepare.mts";

test("retains the original minimal known-failing accessor fidelity evidence", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "pomeranian-3148-"));
  try {
    const source = await readFile(path.join(docsRoot, "fixtures/typedoc-3148.mts.txt"));
    expect(createHash("sha256").update(source).digest("hex")).toBe(evidence.originalMinimalSha256);
    const filename = path.join(output, "minimal.mts");
    await writeFile(filename, source);
    const config = path.join(output, "tsconfig.json");
    await writeFile(
      config,
      JSON.stringify({
        compilerOptions: {
          strict: true,
          target: "ES2022",
          module: "NodeNext",
          noEmit: true,
          types: [],
        },
        files: [filename],
      }),
    );
    const app = await Application.bootstrap(
      {
        entryPoints: [filename],
        tsconfig: config,
        name: "Minimal TypeDoc 3148 regression",
        readme: "none",
        disableSources: true,
      },
      [new TSConfigReader()],
    );
    const project = await app.convert();
    if (!project || app.logger.hasErrors())
      throw new Error("Minimal fidelity regression could not convert");
    const derived = project.children?.find((item) => item.name === "Derived");
    const getter = derived?.children
      ?.find((item) => item.name === "value")
      ?.getSignature?.type?.toString();
    const method = derived?.children
      ?.find((item) => item.name === "method")
      ?.signatures?.[0]?.type?.toString();
    expect({
      expected: "string",
      accessor: getter,
      method,
      accessorFaithful: getter === "string",
    }).toEqual({ expected: "string", accessor: "T", method: "string", accessorFaithful: false });
    // This confirms a known failure remains visible. It does not assert fidelity passes.
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("keeps original concrete-root failures and helper diagnostics visible", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "pomeranian-root-evidence-"));
  try {
    const filename = path.join(repoRoot, "packages/core/prototypes/factory-typing/probe.mts");
    expect(
      createHash("sha256")
        .update(await readFile(filename))
        .digest("hex"),
    ).toBe(evidence.prototypeSha256);
    const entries = [filename, path.join(path.dirname(filename), "contracts.mts")];
    const config = path.join(output, "tsconfig.json");
    await writeFile(
      config,
      JSON.stringify({
        extends: path.join(docsRoot, "tsconfig.prototype.json"),
        compilerOptions: {
          paths: {
            "@playwright/test": [path.join(docsRoot, "node_modules/@playwright/test/index.d.ts")],
          },
          typeRoots: [path.join(docsRoot, "node_modules/@types")],
        },
        include: entries,
      }),
    );
    const app = await Application.bootstrap(
      {
        entryPoints: entries,
        tsconfig: config,
        readme: "none",
        disableSources: true,
        validation: { notExported: true, invalidLink: true, notDocumented: false },
      },
      [new TSConfigReader()],
    );
    const project = await app.convert();
    if (!project || app.logger.hasErrors())
      throw new Error("Original prototype evidence could not convert");
    app.validate(project); // Deliberately visible diagnostics, never a production-generator exception.
    expect(app.logger.warningCount).toBe(evidence.originalHelperWarnings.length);
    const classes = Object.values(project.reflections).filter(
      (item): item is DeclarationReflection =>
        item instanceof DeclarationReflection && item.kindOf(ReflectionKind.Class),
    );
    for (const name of ["AppButton", "StandaloneButton", "FlexibleButton"]) {
      const model = classes.find((item) => item.name === name);
      expect(
        model?.children?.find((item) => item.name === "root")?.getSignature?.type?.toString(),
      ).toBe("Root");
    }
    expect(
      classes
        .find((item) => item.name === "AppButton")
        ?.children?.find((item) => item.name === "getRoot")
        ?.signatures?.[0]?.type?.toString(),
    ).toBe("App");
    expect(
      classes
        .find((item) => item.name === "LibraryButton")
        ?.children?.find((item) => item.name === "getRoot")
        ?.signatures?.[0]?.type?.toString(),
    ).toBe("Root");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
