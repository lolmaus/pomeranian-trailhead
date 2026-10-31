import type { Source } from "./reference.mts";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";

export interface RegisteredSource extends Source {
  workspace: string;
  export: string;
  guides: string[];
}

export interface Workspace {
  name: string;
  directory: string;
  exports?: unknown;
}

export function assertSources(
  workspaces: Workspace[],
  dependencies: Record<string, string>,
  sources: RegisteredSource[],
) {
  for (const workspace of workspaces) {
    const registered = sources.filter((source) => source.package === workspace.name);
    if (workspace.name.startsWith("@pomeranian/") && !registered.length)
      throw new Error(`Unregistered production package: ${workspace.name}`);
    if (!registered.length) continue;
    if (!dependencies[workspace.name]?.startsWith("workspace:"))
      throw new Error(`Missing docs workspace dependency: ${workspace.name}`);
    const exports =
      typeof workspace.exports === "object" &&
      workspace.exports !== null &&
      Object.keys(workspace.exports).some((key) => key.startsWith("."))
        ? (workspace.exports as Record<string, unknown>)
        : { ".": workspace.exports };
    for (const name of Object.keys(exports)) {
      if (name === "./package.json") continue;
      if (!registered.some((source) => source.export === name))
        throw new Error(`Undocumented export: ${workspace.name}${name}`);
    }
    for (const source of registered) {
      if (!source.entry.startsWith(path.resolve(workspace.directory) + path.sep))
        throw new Error(`Source outside owning workspace: ${source.entry}`);
      const entry = exports[source.export];
      function targets(value: unknown): string[] {
        if (typeof value === "string") return [path.resolve(workspace.directory, value)];
        if (value && typeof value === "object") return Object.values(value).flatMap(targets);
        return [];
      }
      if (!targets(entry).includes(path.resolve(source.entry)))
        throw new Error(
          `Documented entry does not match actual export: ${source.package}${source.export}`,
        );
      if (!source.guides.length)
        throw new Error(`Missing API guide notes registration: ${source.package}`);
    }
  }
  for (const source of sources)
    if (!workspaces.some((workspace) => workspace.name === source.package))
      throw new Error(`Unknown source workspace: ${source.package}`);
}

export async function registeredSources(repo: string): Promise<RegisteredSource[]> {
  const sources: RegisteredSource[] = [
    {
      package: "@repo/test-support",
      workspace: "packages/test-support",
      export: "./config",
      entry: path.join(repo, "packages/test-support/src/config.mts"),
      status: "development",
      guides: ["guides/testing.md"],
    },
    {
      package: "@repo/test-support",
      workspace: "packages/test-support",
      export: "./stories",
      entry: path.join(repo, "packages/test-support/src/stories.mts"),
      status: "development",
      guides: ["guides/testing.md"],
    },
    {
      package: "@repo/test-support",
      workspace: "packages/test-support",
      export: "./story-server",
      entry: path.join(repo, "packages/test-support/src/story-server.mts"),
      status: "development",
      guides: ["guides/testing.md"],
    },
  ];
  const workspaces: Workspace[] = [];
  for (const tree of ["apps", "packages"]) {
    for (const item of await readdir(path.join(repo, tree), { withFileTypes: true })) {
      if (!item.isDirectory()) continue;
      const directory = path.join(repo, tree, item.name);
      const text = await readFile(path.join(directory, "package.json"), "utf8").catch(
        (error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") return null;
          throw error;
        },
      );
      if (!text) continue;
      const manifest = JSON.parse(text) as { name: string; exports?: unknown };
      workspaces.push({ name: manifest.name, directory, exports: manifest.exports });
    }
  }
  const docs = JSON.parse(await readFile(path.join(repo, "apps/docs/package.json"), "utf8")) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  assertSources(workspaces, { ...docs.dependencies, ...docs.devDependencies }, sources);
  return sources;
}
