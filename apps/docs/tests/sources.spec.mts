import { test, expect } from "@playwright/test";
import { assertSources, type RegisteredSource } from "../lib/sources.mts";

test("rejects production packages or entrypoints missing from the docs dependency and source graph", () => {
  const workspaces = [
    {
      name: "@pomeranian/core",
      directory: "/repo/packages/core",
      exports: { ".": "./src/index.mts", "./extra": "./src/extra.mts" },
    },
  ];
  expect(() => assertSources(workspaces, {}, [])).toThrow("Unregistered production package");
  const source: RegisteredSource = {
    package: "@pomeranian/core",
    workspace: "packages/core",
    export: ".",
    entry: "/repo/packages/core/src/index.mts",
    status: "production",
    guides: ["guide.md"],
  };
  expect(() => assertSources(workspaces, {}, [source])).toThrow("workspace dependency");
  expect(() => assertSources(workspaces, { "@pomeranian/core": "workspace:*" }, [source])).toThrow(
    "Undocumented export",
  );
  expect(() =>
    assertSources(workspaces, { "@pomeranian/core": "workspace:*" }, [
      source,
      { ...source, export: "./extra", entry: "/repo/packages/core/src/extra.mts" },
    ]),
  ).not.toThrow();
});

test("maps compiled public exports to included defining sources without accepting unrelated outputs", () => {
  const source: RegisteredSource = {
    package: "@pomeranian/core",
    workspace: "packages/core",
    export: "./page-object",
    entry: "/repo/packages/core/src/page-object.ts",
    status: "production",
    guides: ["guides/construction.md"],
  };
  const workspace = {
    name: "@pomeranian/core",
    directory: "/repo/packages/core",
    exports: {
      "./page-object": {
        types: "./dist/page-object.d.ts",
        import: "./dist/page-object.mjs",
        require: "./dist/page-object.js",
      },
    },
  };
  expect(() =>
    assertSources([workspace], { "@pomeranian/core": "workspace:*" }, [source]),
  ).not.toThrow();
  expect(() =>
    assertSources([workspace], { "@pomeranian/core": "workspace:*" }, [
      { ...source, entry: "/repo/packages/core/src/other.ts" },
    ]),
  ).toThrow("Documented entry does not match");
});
