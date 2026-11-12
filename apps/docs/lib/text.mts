import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

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
  const href = (filename: string) => "/" + filename.split("/").map(encodeURIComponent).join("/");
  const topics: string[] = [];
  for (const page of pages) {
    const target = `text/${page.path.replace(/\.md$/, ".txt")}`;
    output.set(target, page.document.markdown);
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
      `# ${symbol.name}\n\nSource: ${symbol.html}\n${anchor ? `Member anchor: ${anchor}\n` : ""}\n${memberText(page.document.markdown, symbol)}`,
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
