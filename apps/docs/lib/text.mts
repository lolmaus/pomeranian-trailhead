import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import MarkdownIt from "markdown-it";

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
      value: textHref(`text/${page.replace(/\.md$/, ".txt")}`) + suffix,
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

interface TextSymbol {
  key: string;
  name: string;
  package: string;
  kind: string;
  html: string;
  parent: string | null;
  aliasOf?: string;
}

// Markdown is the canonical text representation: signatures, overloads, examples,
// history and tables survive without a second independently authored summary.
function memberText(markdown: string, symbol: TextSymbol): string {
  if (!["Method", "Property", "Accessor", "Constructor"].includes(symbol.kind)) return markdown;
  const lines = markdown.split("\n");
  let fenced = false;
  const headings: { index: number; level: number; title: string }[] = [];
  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const heading = /^(#{2,3}) (.*)$/.exec(line);
    if (heading) headings.push({ index, level: heading[1]?.length ?? 0, title: heading[2] ?? "" });
  }
  const matches = headings.filter(
    (heading) => heading.title.replace(/\\/g, "").replace(/\(\)$/, "") === symbol.name,
  );
  // Collision anchors can vary across renderer versions. A full page is safer
  // than silently dropping a static/instance overload when ownership is ambiguous.
  if (matches.length !== 1) return markdown;
  const start = matches[0];
  if (!start) return markdown;
  const end =
    headings.find((heading) => heading.index > start.index && heading.level <= start.level)
      ?.index ?? lines.length;
  const contextEnd =
    headings.find((heading) =>
      ["Constructors", "Properties", "Accessors", "Methods"].includes(heading.title),
    )?.index ?? 0;
  return [
    ...lines.slice(0, Math.min(contextEnd, start.index)),
    ...lines.slice(start.index, end),
  ].join("\n");
}

export function textArtifacts(
  pages: { path: string; document: { markdown: string } }[],
  symbols: TextSymbol[],
): Map<string, string> {
  const output = new Map<string, string>();
  const href = textHref;
  const pageNames = new Set(pages.map((page) => page.path));
  const topics: string[] = [];
  for (const page of pages) {
    const target = `text/${page.path.replace(/\.md$/, ".txt")}`;
    output.set(target, rebaseLinks(page.document.markdown, page.path, pageNames));
    topics.push(`- [${page.path}](${href(target)})`);
  }
  const memberPath = (symbol: TextSymbol) => `text/members/${encodeURIComponent(symbol.key)}.txt`;
  const link = (symbol: TextSymbol) => `- [${symbol.name}](${href(memberPath(symbol))})`;
  for (const symbol of symbols) {
    const [html, anchor] = symbol.html.split("#");
    const page = pages.find((item) => `/${item.path.replace(/\.md$/, ".html")}` === html);
    if (!page) throw new Error(`Missing text source for ${symbol.key}: ${symbol.html}`);
    output.set(
      memberPath(symbol),
      `# ${symbol.name}\n\nSource: ${symbol.html}\n${anchor ? `Member anchor: ${anchor}\n` : ""}\n${memberText(rebaseLinks(page.document.markdown, page.path, pageNames), symbol)}`,
    );
    if (["Class", "Interface", "TypeAlias"].includes(symbol.kind)) {
      output.set(
        `text/types/${encodeURIComponent(symbol.key)}.txt`,
        `# ${symbol.name}\n\n${link(symbol)}\n${symbols
          .filter((child) => child.parent === (symbol.aliasOf ?? symbol.key))
          .map(link)
          .join("\n")}\n`,
      );
    }
  }
  const packages = [...new Set(symbols.map((symbol) => symbol.package))];
  for (const name of packages) {
    output.set(
      `text/packages/${encodeURIComponent(name)}.txt`,
      `# ${name}\n\n${symbols
        .filter((symbol) => symbol.package === name)
        .map((symbol) =>
          ["Class", "Interface", "TypeAlias"].includes(symbol.kind)
            ? `- [${symbol.name}](${href(`text/types/${encodeURIComponent(symbol.key)}.txt`)})\n${link(symbol)}`
            : link(symbol),
        )
        .join("\n")}\n`,
    );
  }
  output.set(
    "llms.txt",
    `# Pomeranian development documentation\n\nComplete generated Markdown text, including API context and checked examples.\n\n${topics.join("\n")}\n\n## Packages\n\n${packages.map((name) => `- [${name}](${href(`text/packages/${encodeURIComponent(name)}.txt`)})`).join("\n")}\n`,
  );
  return output;
}

export async function replaceTextAssets(directory: string, artifacts: Map<string, string>) {
  await rm(path.join(directory, "text"), { recursive: true, force: true });
  await rm(path.join(directory, "llms.txt"), { force: true });
  for (const [name, text] of artifacts) {
    const target = path.join(directory, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, text);
  }
}
