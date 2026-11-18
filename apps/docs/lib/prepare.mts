import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { content } from "./content.mts";
import { reference } from "./reference.mts";
import { registeredSources, type RegisteredSource } from "./sources.mts";
import { files } from "./html-links.mts";
import { textArtifacts, replaceTextAssets } from "./text.mts";
import { canonicalReference } from "./canonical-reference.mts";

export const docsRoot = fileURLToPath(new URL("..", import.meta.url));
export const repoRoot = path.resolve(docsRoot, "../..");

export interface ContentPage {
  path: string;
  origin: "authored" | "reference";
  document: ReturnType<typeof content>;
}

export function referenceNotice(status: string, owner = "@pomeranian/core"): string {
  return status === "production"
    ? `\n\n> **Unreleased ${owner === "@pomeranian/core" ? "core" : owner} API:** ${owner} implementation from main; no npm release is implied.\n`
    : "\n\n> **Development infrastructure:** private workspace API, not a published Pomeranian consumer package.\n";
}

export function guideHistory(
  pages: ContentPage[],
  api: Awaited<ReturnType<typeof reference>>,
  sources: RegisteredSource[],
) {
  const known = new Set(api.symbols.flatMap((symbol) => symbol.history));
  for (const page of pages.filter((item) => item.origin === "authored")) {
    for (const token of page.document.tokens.flatMap((item) => item.children ?? [])) {
      if (token.type !== "text") continue;
      for (const match of token.content.matchAll(
        /(?:Available since|Changed in) @[^\s@]+\/[^\s@]+@(?:Unreleased|[\w.-]+)/g,
      )) {
        if (!known.has(match[0]))
          throw new Error(`Guide history does not match API history in ${page.path}: ${match[0]}`);
      }
    }
  }
  for (const source of sources) {
    const notes = source.guides
      .map((name) => {
        const page = pages.find((item) => item.path === name && item.origin === "authored");
        if (!page) throw new Error(`Missing registered guide: ${name}`);
        return page.document.markdown;
      })
      .join("\n");
    for (const history of api.symbols
      .filter((symbol) => symbol.package === source.package)
      .flatMap((symbol) => symbol.history)) {
      if (!notes.includes(history))
        throw new Error(`Missing corresponding guide history for ${source.package}: ${history}`);
    }
  }
}

export function authoringContext(sourceText: string, compositionText?: string): string {
  const source = ts.createSourceFile(
    "authoring.ts",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const snippets = [
    "Constructor",
    "Class",
    "Default",
    "Equal",
    "Erased",
    "Result",
    "IsAny",
    "Context",
    "TargetArguments",
  ].map((name) => {
    const declaration = source.statements.find(
      (item) => ts.isTypeAliasDeclaration(item) && item.name.text === name,
    );
    if (!declaration) throw new Error(`Missing production authoring helper: ${name}`);
    return `## ${name}\n\n\`\`\`ts\n${declaration.getText(source)}\n\`\`\`\n`;
  });
  if (compositionText !== undefined) {
    const composition = ts.createSourceFile(
      "page-object.ts",
      compositionText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    for (const name of ["Compose", "Before", "Capabilities"]) {
      const declaration = composition.statements.find(
        (item) => ts.isTypeAliasDeclaration(item) && item.name.text === name,
      );
      if (!declaration) throw new Error(`Missing production composition helper: ${name}`);
      snippets.push(`## ${name}\n\n\`\`\`ts\n${declaration.getText(composition)}\n\`\`\`\n`);
    }
  }
  return (
    "# Production authoring helper context\n\nThese declarations come directly from the production authoring and page-object modules. Constructor supports ordinary generic class factories; Compose, Before and Capabilities explain the accumulated-base tuple fold behind inherited with. Result reads the instance/default and complete independent parameter metadata through defaultInstanceType. RootReference defines the Page and nullable root structural boundary; UnboundRoot is RootReference | null. Internal helper names referenced by public factory signatures explain the computation; their appearance here does not create additional package exports. Read the [authoring guide](../guides/authoring.md) for supported conventions and compiler-only limits.\n\n" +
    snippets.join("\n")
  );
}

async function helperContext() {
  const filename = path.join(repoRoot, "packages/core/prototypes/factory-typing/probe.mts");
  const source = ts.createSourceFile(
    filename,
    await readFile(filename, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const names = [
    "Class",
    "Default",
    "Equal",
    "Erased",
    "Result",
    "IsAny",
    "Context",
    "TargetArguments",
  ];
  const snippets = names.map((name) => {
    const declaration = source.statements.find(
      (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === name,
    );
    if (!declaration) throw new Error(`Missing prototype helper: ${name}`);
    return `## ${name}\n\n\`\`\`ts\n${declaration.getText(source)}\n\`\`\`\n`;
  });
  return (
    "# Prototype factory helper context\n\n" +
    "These source-derived declarations are experimental evidence, not supported production APIs. " +
    "They come from [the owning factory proof](https://github.com/lolmaus/pomeranian-trailhead/blob/main/packages/core/prototypes/factory-typing/probe.mts). " +
    "Read the [factory guide](../guides/factory-proof.md) for the checked authoring restrictions and accepted TypeDoc limitation.\n\n" +
    "`Class` describes the constructor receiver without inventing a public construct signature. `Result` selects the declared default instance for erased generic parameters. " +
    "`Context` permits a Page only for nullable roots. `TargetArguments` distinguishes grouping, default-target and explicit-target construction. " +
    "The remaining helpers explain that computation. PageObject, DomPageObject, RootReference and the metadata symbol are declared in the linked owning source. " +
    "No blanket inline expansion or hidden TypeDoc diagnostic is used.\n\n" +
    snippets.join("\n")
  );
}

export async function prepare(output: string, referenceMode: "check" | "refresh" = "check") {
  await mkdir(output, { recursive: true });
  const scratch = await mkdtemp(path.join(output, ".prepare-"));
  const site = path.join(output, "site");
  try {
    const sources = await registeredSources(repoRoot);
    const api = await reference(sources, path.join(scratch, "api"));
    const examples: Record<string, string> = {};
    for (const file of await files(path.join(docsRoot, "examples"))) {
      if (!file.endsWith(".spec.mts")) throw new Error(`Unregistered maintained example: ${file}`);
      examples[path.relative(docsRoot, file).split(path.sep).join("/")] = await readFile(
        file,
        "utf8",
      );
    }
    const authored = (await readdir(docsRoot))
      .filter((file) => file.endsWith(".md"))
      .map((file) => path.join(docsRoot, file));
    for (const tree of ["api", "guides", "recipes"])
      authored.push(...(await files(path.join(docsRoot, tree))));
    const pages: ContentPage[] = [];
    for (const file of authored.sort()) {
      if (!file.endsWith(".md")) throw new Error(`Unsupported authored content file: ${file}`);
      const name = path.relative(docsRoot, file).split(path.sep).join("/");
      try {
        pages.push({
          path: name,
          origin: "authored",
          document: content(await readFile(file, "utf8"), examples),
        });
      } catch (error) {
        throw new Error(`${name}: ${String(error)}`);
      }
    }
    guideHistory(pages, api, sources);
    const expectedReference = new Map<string, string>();
    for (const file of await files(path.join(scratch, "api/reference"))) {
      if (!file.endsWith(".md")) continue;
      const name =
        "reference/development/" +
        path.relative(path.join(scratch, "api/reference"), file).split(path.sep).join("/");
      const markdown = await readFile(file, "utf8");
      const relative = path
        .relative(path.join(scratch, "api/reference"), file)
        .split(path.sep)
        .join("/");
      const owners = api.symbols.filter(
        (symbol) => symbol.html.split("#")[0] === relative.replace(/\.md$/, ".html"),
      );
      const production = owners.some((symbol) =>
        sources.some(
          (source) => source.package === symbol.package && source.status === "production",
        ),
      );
      const notice =
        relative === "index.md"
          ? "\n\nGenerated reference includes unreleased production packages and private development infrastructure. The development URL segment is retained for existing links.\n"
          : referenceNotice(production ? "production" : "development", owners[0]?.package);
      expectedReference.set(name.slice("reference/".length), content(markdown + notice).markdown);
    }
    expectedReference.set("prototype-helpers.md", content(await helperContext()).markdown);
    expectedReference.set(
      "authoring-helpers.md",
      content(
        authoringContext(
          await readFile(path.join(repoRoot, "packages/core/src/authoring.ts"), "utf8"),
          await readFile(path.join(repoRoot, "packages/core/src/page-object.ts"), "utf8"),
        ),
      ).markdown,
    );
    // The comparison runs before publishing anything. Website and raw Markdown
    // both consume the tracked files, never a second generated reference tree.
    const canonical =
      referenceMode === "refresh"
        ? expectedReference
        : await canonicalReference(path.join(docsRoot, "reference"), expectedReference, "check");
    for (const [name, markdown] of canonical) {
      pages.push({ path: `reference/${name}`, origin: "reference", document: content(markdown) });
    }
    const generatedSite = path.join(scratch, "site");
    const names = new Set<string>();
    for (const page of pages) {
      if (names.has(page.path)) throw new Error(`Duplicate content output: ${page.path}`);
      names.add(page.path);
      const target = path.join(generatedSite, page.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, page.document.markdown);
    }
    await mkdir(path.join(generatedSite, ".vitepress"), { recursive: true });
    await cp(
      path.join(docsRoot, ".vitepress/config.mjs"),
      path.join(generatedSite, ".vitepress/config.mjs"),
    );
    for (const symbol of api.symbols) symbol.html = `/reference/development/${symbol.html}`;
    const artifacts = textArtifacts(pages, api.symbols);
    // A failed parser, link or coverage check must not replace the last valid
    // canonical inputs. Refresh only after the entire corpus has been validated.
    if (referenceMode === "refresh") {
      await canonicalReference(path.join(docsRoot, "reference"), expectedReference, "refresh");
    }
    const model = { schemaVersion: 1, pages, api };
    await writeFile(path.join(scratch, "api/api-model.json"), JSON.stringify(api, null, 2) + "\n");
    await writeFile(
      path.join(scratch, "content-model.json"),
      JSON.stringify(model, null, 2) + "\n",
    );
    await mkdir(site, { recursive: true });
    // Retain the last production artifact and VitePress cache while replacing inputs.
    for (const file of await files(site)) {
      if (!path.relative(site, file).startsWith(".vitepress" + path.sep) && file.endsWith(".md"))
        await rm(file);
    }
    await cp(generatedSite, site, { recursive: true });
    await replaceTextAssets(path.join(site, "public"), artifacts);
    await rm(path.join(output, "api"), { recursive: true, force: true });
    await cp(path.join(scratch, "api"), path.join(output, "api"), { recursive: true });
    await cp(path.join(scratch, "content-model.json"), path.join(output, "content-model.json"));
    return { ...model, site };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
