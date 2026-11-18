import path from "node:path";
import MarkdownIt from "markdown-it";
import type { TextPage, TextSymbol } from "./text.mts";

const parser = new MarkdownIt();
function payload(markdown: string): string {
  return JSON.stringify(
    parser
      .parse(markdown, {})
      .flatMap((token) =>
        token.children
          ? token.children.map((child) => [child.type, child.content])
          : [[token.type, token.content, token.info]],
      ),
  );
}

function meaning(markdown: string): string {
  return parser
    .parse(markdown, {})
    .flatMap((token) =>
      token.children
        ? token.children
            .filter((child) => ["text", "code_inline"].includes(child.type))
            .map((child) => child.content)
        : ["fence", "code_block"].includes(token.type)
          ? [token.content]
          : [],
    )
    .join(" ")
    .replaceAll("[", " ")
    .replaceAll("]", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function checkSourcePayload(symbol: TextSymbol, markdown: string) {
  const expected = symbol.payload;
  const count = expected?.signatures ?? symbol.signatures ?? 0;
  const name = symbol.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const signature =
    symbol.kind === "Constructor"
      ? /^\*\*new [^*]+\*\*.*\(/
      : new RegExp(`^(?:\\*\\*${name}\\*\\*|${name})[^\\n]*\\(`);
  const actual = parser
    .parse(markdown, {})
    .filter(
      (token) =>
        token.type === "inline" && signature.test(token.content.replace(/^(?:`[^`]+`\s+)*/, "")),
    ).length;
  if (actual < count)
    throw new Error(`Missing API signatures for ${symbol.key}: expected ${count}, found ${actual}`);
  const rendered = meaning(markdown);
  for (const history of symbol.history ?? [])
    if (!rendered.includes(meaning(history)))
      throw new Error(`Missing API history for ${symbol.key}: ${history}`);
  for (const fragment of expected?.comments ?? []) {
    const text = meaning(fragment);
    if (text && !rendered.includes(text))
      throw new Error(`Missing API payload for ${symbol.key}: ${text}`);
  }
  if (
    expected?.getter &&
    !parser
      .parse(markdown, {})
      .some((token) => token.type === "inline" && token.content.startsWith("**get** **"))
  )
    throw new Error(`Missing API getter for ${symbol.key}`);
  if (
    expected?.setter &&
    !parser
      .parse(markdown, {})
      .some((token) => token.type === "inline" && token.content.startsWith("**set** **"))
  )
    throw new Error(`Missing API setter for ${symbol.key}`);
}

// Mirrors VitePress's default slug rules, including duplicate-heading suffixes.
function anchors(markdown: string): Set<string> {
  const result = new Set<string>();
  const tokens = parser.parse(markdown, {});
  for (const [index, token] of tokens.entries()) {
    if (token.type !== "heading_open") continue;
    const heading = tokens[index + 1];
    const explicit = /\s*\{#([^}]+)\}$/.exec(heading?.content ?? "");
    const text = (heading?.children ?? [])
      .filter((child) => ["text", "code_inline"].includes(child.type))
      .map((child) => child.content)
      .join("");
    const slug =
      explicit?.[1] ??
      text
        .normalize("NFKD")
        // VitePress strips control characters when constructing heading IDs.
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0300-\u036f\u0000-\u001f]/g, "")
        .replace(/[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/^(\d)/, "_$1")
        .toLowerCase();
    let unique = slug;
    for (let suffix = 1; result.has(unique); suffix++) unique = `${slug}-${suffix}`;
    result.add(unique);
  }
  return result;
}

export function corpusCheck(
  pages: TextPage[],
  symbols: TextSymbol[],
  artifacts: Map<string, string>,
): void {
  const names = new Set<string>();
  for (const page of pages) {
    if (names.has(page.path.toLowerCase()))
      throw new Error(`Duplicate canonical document: ${page.path}`);
    names.add(page.path.toLowerCase());
  }
  for (const page of pages) {
    const published = artifacts.get(page.path);
    if (published === undefined) throw new Error(`Missing canonical document: ${page.path}`);
    if (payload(published) !== payload(page.document.markdown))
      throw new Error(`Content loss in ${page.path}`);
  }
  const keys = new Set<string>();
  for (const symbol of symbols) {
    if (keys.has(symbol.key.toLowerCase()))
      throw new Error(`Duplicate symbol identity: ${symbol.key}`);
    keys.add(symbol.key.toLowerCase());
    if (
      symbol.aliasOf &&
      !symbols.some((target) => target.key === symbol.aliasOf && !target.aliasOf)
    )
      throw new Error(`Unresolved alias: ${symbol.key}`);
    if (symbol.parent && !symbols.some((parent) => parent.key === symbol.parent))
      throw new Error(`Missing symbol parent: ${symbol.key}`);
    const page = decodeURIComponent(symbol.html.split(/[?#]/)[0] ?? "")
      .replace(/^\//, "")
      .replace(/\.html$/, ".md");
    if (!pages.some((item) => item.path === page))
      throw new Error(`Missing symbol document: ${symbol.key}`);
    // An alias keeps its public name, but its page and source payload belong to
    // the defining declaration (including renamed re-exports).
    const definition = symbol.aliasOf
      ? symbols.find((candidate) => candidate.key === symbol.aliasOf)!
      : symbol;
    checkSourcePayload(definition, artifacts.get(page) ?? "");
  }
  const targets = new Map<string, Set<string>>();
  const artifactNames = new Set<string>();
  for (const [name, markdown] of artifacts) {
    if (artifactNames.has(name.toLowerCase())) throw new Error(`Duplicate resource path: ${name}`);
    artifactNames.add(name.toLowerCase());
    targets.set(name, anchors(markdown));
  }
  const edges = new Map<string, Set<string>>();
  function resolve(source: string, href: string): string | undefined {
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(href)) return;
    let url: URL;
    try {
      url = new URL(href, `https://docs.invalid/${source}`);
      decodeURIComponent(url.pathname);
      decodeURIComponent(url.hash);
    } catch {
      throw new Error(`Malformed Markdown link in ${source}: ${href}`);
    }
    let target = decodeURIComponent(url.pathname)
      .slice(1)
      .replace(/\.html$/, ".md");
    if (target.endsWith("/")) target += "index.md";
    if (!target) target = "index.md";
    if (!targets.has(target) && !path.posix.extname(target)) target += ".md";
    if (!targets.has(target)) throw new Error(`Broken Markdown link in ${source}: ${href}`);
    const anchor = decodeURIComponent(url.hash.slice(1));
    if (anchor && !targets.get(target)?.has(anchor))
      throw new Error(`Broken Markdown anchor in ${source}: ${href}`);
    return target;
  }
  for (const [source, markdown] of artifacts) {
    const links = parser
      .parse(markdown, {})
      .flatMap((token) => token.children ?? [])
      .filter((token) => token.type === "link_open");
    const linked = new Set<string>();
    for (const link of links) {
      const target = resolve(source, link.attrGet("href") ?? "");
      if (target) linked.add(target);
    }
    edges.set(source, linked);
  }
  for (const symbol of symbols) resolve("llms.txt", symbol.html);
  const reached = new Set<string>();
  const queue = ["llms.txt"];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index] ?? "";
    if (reached.has(current)) continue;
    reached.add(current);
    queue.push(...(edges.get(current) ?? []));
  }
  for (const name of artifacts.keys())
    if (!reached.has(name)) throw new Error(`Orphan Markdown resource: ${name}`);
}
