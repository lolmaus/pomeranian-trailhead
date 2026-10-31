import { MarkdownRendererEvent, type MarkdownRenderer } from "typedoc-plugin-markdown";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  Application,
  DeclarationReflection,
  ReflectionKind,
  TSConfigReader,
  normalizePath,
  type TypeDocOptions,
  type Reflection,
} from "typedoc";

const docsRoot = fileURLToPath(new URL("..", import.meta.url));

export interface Source {
  package: string;
  entry: string;
  status: "development" | "production" | "fixture";
}

export interface SymbolEntry {
  key: string;
  name: string;
  package: string;
  kind: string;
  html: string;
  signatures: number;
  inherited: boolean;
  protected: boolean;
  history: string[];
  parent: string | null;
  reflectionId: number;
  sources: { file: string; line: number }[];
}

export async function reference(sources: Source[], output: string) {
  if (!sources.length) throw new Error("No registered documentation sources");
  await mkdir(output, { recursive: true });
  const config = path.join(output, "tsconfig.json");
  await writeFile(
    config,
    JSON.stringify({
      extends: path.join(docsRoot, "tsconfig.typedoc.json"),
      compilerOptions: { typeRoots: [path.join(docsRoot, "node_modules/@types")] },
      include: sources.map((source) => source.entry),
    }),
  );
  const options: Partial<TypeDocOptions> & {
    docsRoot: string;
    sidebar: { autoConfiguration: boolean };
  } = {
    entryPoints: sources.map((source) => source.entry),
    tsconfig: config,
    plugin: ["typedoc-plugin-markdown", "typedoc-vitepress-theme"],
    name: "Pomeranian development reference",
    readme: "none",
    excludePrivate: true,
    excludeProtected: false,
    disableSources: sources.every((source) => source.status === "fixture"),
    out: path.join(output, "reference"),
    docsRoot: path.join(output, "reference"),
    sidebar: { autoConfiguration: false },
    validation: { notExported: true, invalidLink: true, notDocumented: true },
    requiredToBeDocumented: [
      "Class",
      "Interface",
      "Property",
      "Variable",
      "Function",
      "TypeAlias",
      "Method",
      "Accessor",
    ],
    treatWarningsAsErrors: true,
  };
  const app = await Application.bootstrapWithPlugins(options, [new TSConfigReader()]);
  if (ts.version !== "6.0.3" || app.getTypeScriptVersion() !== "6.0.3")
    throw new Error("Documentation compiler must be TypeScript 6.0.3");
  const project = await app.convert();
  if (!project || app.logger.hasErrors() || app.logger.hasWarnings())
    throw new Error("API conversion failed; see TypeDoc diagnostics");
  app.validate(project);
  if (app.logger.hasErrors() || app.logger.hasWarnings())
    throw new Error("API documentation validation failed; see TypeDoc diagnostics");
  const symbolProject = project;
  const symbols: SymbolEntry[] = [];
  const ownerByReflection: Record<string, string> = { [project.id]: "project" };
  const byId = new Map<number, SymbolEntry>();
  function discover(reflection: DeclarationReflection, pkg: string, parent: string | null) {
    const filename =
      reflection.sources?.[0]?.fullFileName ??
      symbolProject.getSymbolIdFromReflection(reflection)?.fileName;
    const module = reflection.kindOf(ReflectionKind.Module)
      ? (sources.find(
          (source) => filename && path.resolve(source.entry) === path.resolve(filename),
        ) ?? sources.find((source) => source.package === reflection.name))
      : undefined;
    const owner = module?.package ?? pkg;
    if (!owner) throw new Error(`Unregistered API owner: ${reflection.name}`);
    const kind = ReflectionKind.singularString(reflection.kind);
    const segment = `${kind.toLowerCase()}-${reflection.flags.isStatic ? "static" : "instance"}-${encodeURIComponent(reflection.name)}`;
    const key = parent ? `${parent}/${segment}` : `${encodeURIComponent(owner)}/${segment}`;
    if (symbols.some((symbol) => symbol.key === key))
      throw new Error(`Duplicate symbol identity: ${key}`);
    const symbol: SymbolEntry = {
      key,
      name: reflection.name,
      package: owner,
      kind,
      parent,
      html: "",
      reflectionId: reflection.id,
      signatures: reflection.signatures?.length ?? 0,
      inherited: !!reflection.inheritedFrom,
      protected: reflection.flags.isProtected,
      history: [],
      sources: (reflection.sources ?? []).map((source) => ({
        file: source.fullFileName,
        line: source.line,
      })),
    };
    symbols.push(symbol);
    byId.set(reflection.id, symbol);
    ownerByReflection[reflection.id] = key;
    for (const child of reflection.children ?? []) discover(child, owner, key);
  }
  for (const reflection of project.children ?? [])
    discover(reflection, sources.length === 1 ? (sources[0]?.package ?? "") : "", null);
  for (const reflection of Object.values(project.reflections)) {
    let owner: Reflection | undefined = reflection;
    while (owner && !byId.has(owner.id)) owner = owner.parent;
    const symbol = owner ? byId.get(owner.id) : undefined;
    ownerByReflection[reflection.id] ??= symbol?.key ?? "project";
    const history: string[] = [];
    for (const tag of reflection.comment?.blockTags ?? []) {
      const text = tag.content.map((part) => part.text).join("");
      if (tag.tag === "@since") {
        const value = text.replace(/^Available since /, "").trim();
        const match = /^(@[^\s@]+\/[^\s@]+)@(Unreleased|\d+\.\d+\.\d+(?:-[\w.-]+)?)$/.exec(value);
        const inherited = owner instanceof DeclarationReflection && !!owner.inheritedFrom;
        if (!match || (!inherited && symbol && match[1] !== symbol.package))
          throw new Error(`Invalid package-qualified @since on ${reflection.name}: ${text}`);
        const line = `Available since ${value}`;
        history.push(line);
        tag.content = [{ kind: "text", text: line }];
      }
      for (const match of text.matchAll(/Changed in ([^\s:]+)(?::|\s|$)/g)) {
        const value = match[1] ?? "";
        const metadata = /^(@[^\s@]+\/[^\s@]+)@(Unreleased|\d+\.\d+\.\d+(?:-[\w.-]+)?)$/.exec(
          value,
        );
        const inherited = owner instanceof DeclarationReflection && !!owner.inheritedFrom;
        if (!metadata || (!inherited && symbol && metadata[1] !== symbol.package))
          throw new Error(`Invalid package-qualified change history: ${text}`);
        history.push(`Changed in ${value}`);
      }
      if (text.includes("Changed in") && !history.some((line) => line.startsWith("Changed in")))
        throw new Error(`Malformed change history: ${text}`);
    }
    if (symbol) symbol.history.push(...history);
  }
  for (const symbol of symbols) {
    if (
      !symbol.inherited &&
      !["Module", "Namespace", "Constructor"].includes(symbol.kind) &&
      !symbol.history.some((line) => line.startsWith("Available since"))
    ) {
      throw new Error(`Missing package-qualified availability: ${symbol.key}`);
    }
  }
  const renderer = app.renderer as MarkdownRenderer;
  renderer.on(MarkdownRendererEvent.END, () => {
    for (const symbol of symbols) {
      const model = project.getReflectionById(symbol.reflectionId);
      if (!model || !renderer.router)
        throw new Error(`Missing rendered symbol mapping: ${symbol.key}`);
      symbol.html = renderer.router.getFullUrl(model).replace(/\.md(?=#|$)/, ".html");
      if (!symbol.html) throw new Error(`Empty rendered symbol mapping: ${symbol.key}`);
    }
  });
  await app.generateOutputs(project);
  if (app.logger.hasErrors() || app.logger.hasWarnings())
    throw new Error("API rendering failed; see TypeDoc diagnostics");
  for (const symbol of symbols) {
    symbol.history = [...new Set(symbol.history)];
  }
  const reflection = app.serializer.projectToObject(project, normalizePath(docsRoot));
  const model = {
    schemaVersion: 1,
    typescript: ts.version,
    packages: sources,
    symbols,
    ownerByReflection,
    reflection,
  };
  await writeFile(path.join(output, "api-model.json"), JSON.stringify(model, null, 2) + "\n");
  return model;
}
