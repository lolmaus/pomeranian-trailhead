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
