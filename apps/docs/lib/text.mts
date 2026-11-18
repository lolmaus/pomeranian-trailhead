import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ApiPayload } from "./reference.mts";
import MarkdownIt from "markdown-it";
import { corpusCheck } from "./corpus-check.mts";

const markdownParser = new MarkdownIt();
const textHref = (filename: string) => "/" + filename.split("/").map(encodeURIComponent).join("/");

// Use Markdown's destination parser and code-block maps, preserving source text
// rather than rendering signatures/examples through a second representation.
function rebaseLinks(markdown: string, source: string, pageNames: Set<string>): string {
  const tokens = markdownParser.parse(markdown, {});
  const links = new Set(
    tokens
      .flatMap((token) => token.children ?? [])
      .filter((token) => token.type === "link_open")
      .map((token) => token.attrGet("href")),
  );
  const offsets = [0];
  for (const match of markdown.matchAll(/\n/g)) offsets.push((match.index ?? 0) + 1);
  const code = tokens
    .filter((token) => token.type === "fence" || token.type === "code_block")
    .flatMap((token) =>
      token.map
        ? [[offsets[token.map[0]] ?? 0, offsets[token.map[1]] ?? markdown.length] as const]
        : [],
    );
  const replacements: { start: number; end: number; value: string }[] = [];
  function destination(start: number) {
    const parsed = markdownParser.helpers.parseLinkDestination(markdown, start, markdown.length);
    if (!parsed.ok || !links.has(markdownParser.normalizeLink(parsed.str))) return;
    const href = parsed.str;
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(href)) return;
    const split = href.search(/[?#]/);
    const pathname = split < 0 ? href : href.slice(0, split);
    const suffix = split < 0 ? "" : href.slice(split);
    let page = pathname
      ? path.posix.resolve("/", path.posix.dirname(source), decodeURIComponent(pathname)).slice(1)
      : source;
    if (page.endsWith("/")) page += "index.md";
    if (page.endsWith(".html")) page = page.replace(/\.html$/, ".md");
    if (!pageNames.has(page))
      throw new Error(`Missing text link destination in ${source}: ${href}`);
    replacements.push({
      start,
      end: parsed.pos,
      value: textHref(page) + suffix,
    });
  }
  for (let index = 0; index < markdown.length; index++) {
    const block = code.find(([start, end]) => index >= start && index < end);
    if (block) {
      index = block[1] - 1;
      continue;
    }
    if (markdown[index] === "\\") {
      index++;
      continue;
    }
    if (markdown[index] === "`") {
      const marker = /^`+/.exec(markdown.slice(index))?.[0] ?? "`";
      let end = markdown.indexOf(marker, index + marker.length);
      while (end >= 0 && (markdown[end - 1] === "`" || markdown[end + marker.length] === "`"))
        end = markdown.indexOf(marker, end + marker.length);
      if (end >= 0) index = end + marker.length - 1;
      continue;
    }
    if (markdown.startsWith("](", index)) {
      const whitespace = /^\s*/.exec(markdown.slice(index + 2))?.[0].length ?? 0;
      destination(index + 2 + whitespace);
    }
  }
  for (const label of markdown.matchAll(/^ {0,3}\[[^\n]+\]:\s*/gm)) {
    const start = label.index;
    if (!code.some(([from, to]) => start >= from && start < to))
      destination(start + label[0].length);
  }
  let result = markdown;
  for (const item of replacements.sort((a, b) => b.start - a.start))
    result = result.slice(0, item.start) + item.value + result.slice(item.end);
  return result;
}

export interface TextSymbol {
  key: string;
  name: string;
  package: string;
  kind: string;
  html: string;
  parent: string | null;
  aliasOf?: string;
  signatures?: number;
  history?: string[];
  payload?: ApiPayload;
}

export interface TextPage {
  path: string;
  document: { markdown: string };
}

const segment = encodeURIComponent;
const symbolPage = (symbol: TextSymbol) =>
  decodeURIComponent(symbol.html.split(/[?#]/)[0] ?? "")
    .replace(/^\//, "")
    .replace(/\.html$/, ".md");
function title(markdown: string, fallback: string): string {
  const tokens = markdownParser.parse(markdown, {});
  const heading = tokens.findIndex((token) => token.type === "heading_open");
  return (
    tokens[heading + 1]?.children
      ?.filter((token) => ["text", "code_inline"].includes(token.type))
      .map((token) => token.content)
      .join("") || fallback
  ).replace(/[\\[\]]/g, "\\$&");
}
function description(markdown: string): string {
  const tokens = markdownParser.parse(markdown, {});
  const paragraph = tokens.findIndex((token) => token.type === "paragraph_open");
  return paragraph < 0
    ? "Complete reference documentation."
    : (
        tokens[paragraph + 1]?.children
          ?.filter((token) => ["text", "code_inline"].includes(token.type))
          .map((token) => token.content)
          .join("") || "Complete documentation."
      )
        .replace(/\s+/g, " ")
        .slice(0, 180);
}

export function textArtifacts(pages: TextPage[], symbols: TextSymbol[]): Map<string, string> {
  const output = new Map<string, string>();
  function publish(name: string, markdown: string) {
    if ([...output.keys()].some((key) => key.toLowerCase() === name.toLowerCase()))
      throw new Error(`Duplicate resource path: ${name}`);
    output.set(name, markdown);
  }
  const pageNames = new Set(pages.map((page) => page.path));
  const names = new Set<string>();
  for (const page of pages) {
    const key = page.path.toLowerCase();
    if (names.has(key)) throw new Error(`Duplicate canonical document: ${page.path}`);
    names.add(key);
    publish(page.path, rebaseLinks(page.document.markdown, page.path, pageNames));
  }
  for (const symbol of symbols) {
    if (!pageNames.has(symbolPage(symbol)))
      throw new Error(`Missing canonical source for ${symbol.key}: ${symbol.html}`);
  }
  const ordered = [...pages].sort((a, b) => a.path.localeCompare(b.path, "en"));
  const link = (page: TextPage) =>
    `- [${title(page.document.markdown, page.path)}](${textHref(page.path)}): ${description(page.document.markdown)}`;
  const symbolLink = (symbol: TextSymbol) =>
    `- [${symbol.name}](${textHref(symbolPage(symbol))}${symbol.html.includes("#") ? "#" + symbol.html.split("#")[1] : ""}): ${symbol.kind} in ${symbol.package}.`;
  const packages = [...new Set(symbols.map((symbol) => symbol.package))].sort();
  const sections = [
    ...new Set(
      ordered.map(
        (page) => (page.path.includes("/") ? page.path.split("/")[0] : "topics") ?? "topics",
      ),
    ),
  ].sort();
  const canonical = ordered.filter(
    (page) =>
      !symbols.some(
        (symbol) =>
          symbol.aliasOf &&
          symbolPage(symbol) === page.path &&
          !symbols.some((other) => !other.aliasOf && symbolPage(other) === page.path),
      ),
  );
  function bundle(name: string, scope: string, documents: TextPage[]) {
    const body = documents
      .map(
        (page) =>
          `<!-- BEGIN DOCUMENT: ${textHref(page.path)} -->\n\nSource: [${page.path}](${textHref(page.path)})\n\n${output.get(page.path)}\n\n<!-- END DOCUMENT: ${textHref(page.path)} -->`,
      )
      .join("\n\n");
    const value = `# ${scope}\n\nScope: ${documents.length} canonical documents. Each document appears once. Links lead to independently retrievable canonical Markdown. Clients may truncate large responses; request individual documents when needed.\n\n${body}\n`;
    publish(name, value);
    return `- [${scope}](${textHref(name)}): ${documents.length} documents; ${Buffer.byteLength(value, "utf8")} UTF-8 bytes.`;
  }
  const bundleLinks: string[] = [];
  const typeLinks: string[] = [];
  for (const section of sections) {
    const documents = canonical.filter(
      (page) => (page.path.includes("/") ? page.path.split("/")[0] : "topics") === section,
    );
    const listing = documents.map(link).join("\n");
    publish(`indexes/topics/${segment(section)}.md`, `# ${section} topics\n\n${listing}\n`);
    bundleLinks.push(
      bundle(`bundles/sections/${segment(section)}.md`, `${section} section`, documents),
    );
  }
  for (const name of packages) {
    const members = symbols.filter((symbol) => symbol.package === name);
    const memberPages = new Set(members.map(symbolPage));
    publish(
      `indexes/packages/${segment(name)}.md`,
      `# ${name}\n\n${members.map(symbolLink).join("\n")}\n`,
    );
    bundleLinks.push(
      bundle(
        `bundles/packages/${segment(name)}.md`,
        `${name} package`,
        canonical.filter((page) => memberPages.has(page.path)),
      ),
    );
  }
  for (const symbol of symbols.filter(
    (item) => !item.aliasOf && ["Class", "Interface", "TypeAlias"].includes(item.kind),
  )) {
    publish(
      `indexes/types/${segment(symbol.key)}.md`,
      `# ${symbol.name}\n\n${symbolLink(symbol)}\n\n## Members\n\n${symbols
        .filter((child) => child.parent === symbol.key)
        .map(symbolLink)
        .join("\n")}\n`,
    );
    typeLinks.push(
      `- [${symbol.name}](${textHref(`indexes/types/${segment(symbol.key)}.md`)}): Type overview and inherited member links.`,
    );
  }
  publish("indexes/types.md", `# Types\n\n${typeLinks.join("\n")}\n`);
  bundleLinks.push(bundle("llms-full.txt", "Complete documentation", canonical));
  publish("indexes/bundles.md", `# Complete bundles\n\n${bundleLinks.join("\n")}\n`);
  publish(
    "llms.txt",
    `# Pomeranian development documentation\n\n> Shared documentation for Pomeranian development, with checked examples and complete API reference.\n\nStart with a topic or package, then follow canonical Markdown links for member context. Large bundles can exceed client context limits; individual documents and smaller bundles retain the same content.\n\n## Topics\n\n${ordered
      .filter((page) => !page.path.startsWith("reference/"))
      .map(link)
      .join(
        "\n",
      )}\n\n## Packages\n\n${packages.map((name) => `- [${name}](${textHref(`indexes/packages/${segment(name)}.md`)}): Package API and member index.`).join("\n")}\n\n## Types\n\n- [Type overviews](/indexes/types.md): Class and interface context with inherited member links.\n\n## Topic indexes\n\n${sections.map((section) => `- [${section}](${textHref(`indexes/topics/${segment(section)}.md`)}): Complete ${section} topic index.`).join("\n")}\n\n## Bundles\n\n- [Bundle sizes and scope](/indexes/bundles.md): Section, package, and full corpus downloads.\n${bundleLinks.join("\n")}\n`,
  );
  corpusCheck(pages, symbols, output);
  return output;
}

function safeAsset(name: string): boolean {
  return (
    !name.startsWith(".") &&
    !path.posix.isAbsolute(name) &&
    !name.split("/").some((part) => !part || part === ".." || part.startsWith(".")) &&
    !name.includes("\\")
  );
}

export async function replaceTextAssets(directory: string, artifacts: Map<string, string>) {
  for (const name of artifacts.keys())
    if (!safeAsset(name)) throw new Error(`Unsafe text asset: ${name}`);
  const manifest = path.join(directory, ".text-assets.json");
  let previous: string[] = [];
  try {
    previous = JSON.parse(await readFile(manifest, "utf8")) as string[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const name of previous) {
    if (!safeAsset(name)) throw new Error(`Unsafe previous text asset: ${name}`);
    if (!artifacts.has(name)) await rm(path.join(directory, name), { force: true });
  }
  await rm(path.join(directory, "text"), { recursive: true, force: true });
  for (const name of ["indexes", "bundles"])
    await rm(path.join(directory, name), { recursive: true, force: true });
  for (const name of ["llms.txt", "llms-full.txt"])
    await rm(path.join(directory, name), { force: true });
  for (const [name, text] of artifacts) {
    const target = path.join(directory, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text);
  }
  await writeFile(manifest, JSON.stringify([...artifacts.keys()].sort()));
}
