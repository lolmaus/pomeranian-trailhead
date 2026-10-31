import type { Source } from "./reference.mts";

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
  void workspaces;
  void dependencies;
  void sources;
}
