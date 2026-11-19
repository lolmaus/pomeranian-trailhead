import { readFile } from "node:fs/promises";
import path from "node:path";
import { anchors } from "./corpus-check.mts";
import MarkdownIt from "markdown-it";
import { parse, type DefaultTreeAdapterTypes } from "parse5";
import { pathToFileURL } from "node:url";

const parser = new MarkdownIt();
function links(markdown: string): { label: string; href: string }[] {
  return parser.parse(markdown, {}).flatMap((block) => {
    const children = block.children ?? [];
    return children.flatMap((token, index) =>
      token.type === "link_open"
        ? [{ label: children[index + 1]?.content ?? "", href: token.attrGet("href") ?? "" }]
        : [],
    );
  });
}

/** Retrieve representative production documentation and its discovery chain. */
export async function checkLive(origin: string, artifact?: string): Promise<string[]> {
  const base = new URL(origin);
  const checked = new Map<string, string>();
  async function retrieve(href: string, from = base) {
    const url = new URL(href, from);
    url.hash = "";
    const existing = checked.get(url.href);
    if (existing !== undefined) return existing;
    if (url.origin !== base.origin) throw new Error(`Cross-origin resource: ${url.href}`);
    let current = url;
    let response: Response | undefined;
    for (let redirects = 0; redirects <= 5; redirects++) {
      response = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location) throw new Error(`Redirect without Location: ${current.href}`);
      const next = new URL(location, current);
      if (next.origin !== base.origin)
        throw new Error(`Cross-origin redirect: ${current.href} -> ${next.href}`);
      await response.body?.cancel();
      current = next;
    }
    if (!response) throw new Error(`No response: ${url.href}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url.href}`);
    const body = await response.text();
    if (
      url.pathname !== "/" &&
      (/text\/html/i.test(response.headers.get("content-type") ?? "") ||
        /<!doctype html|<html[\s>]/i.test(body))
    )
      throw new Error(`HTML fallback: ${url.href}`);
    if (artifact) {
      const name = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).slice(1);
      const filename = path.resolve(artifact, name);
      if (!filename.startsWith(path.resolve(artifact) + path.sep))
        throw new Error(`Unsafe artifact path: ${url.href}`);
      if (body !== (await readFile(filename, "utf8")))
        throw new Error(`Artifact mismatch: ${url.href}`);
    }
    checked.set(url.href, body);
    return body;
  }
  function requireLink(
    markdown: string,
    select: (item: { label: string; href: string }) => boolean,
    description: string,
  ) {
    const found = links(markdown).find(select);
    if (!found) throw new Error(`Missing ${description} link`);
    return found.href;
  }
  const home = await retrieve("/");
  function visibleText(node: DefaultTreeAdapterTypes.Node): string {
    if (["script", "style", "template", "head"].includes(node.nodeName)) return "";
    if ("value" in node) return node.value;
    return "childNodes" in node ? node.childNodes.map(visibleText).join(" ") : "";
  }
  const homepageText = visibleText(parse(home));
  if (!/pomeranian/i.test(homepageText) || !/development/i.test(homepageText))
    throw new Error("Missing homepage development labeling");
  const discovery = await retrieve("/llms.txt");
  if (!/Pomeranian development documentation/.test(discovery))
    throw new Error("Wrong discovery content");
  const guide = await retrieve("/getting-started.md");
  if (!/getting started/i.test(guide)) throw new Error("Wrong getting-started content");
  const indexes = links(discovery).filter(({ href }) => href.startsWith("/indexes/"));
  for (const index of indexes) await retrieve(index.href);
  const types = await retrieve(
    requireLink(discovery, ({ href }) => href === "/indexes/types.md", "type index"),
  );
  const type = await retrieve(
    requireLink(types, ({ label }) => label === "TextInput", "TextInput index"),
  );
  const overview = await retrieve(
    requireLink(
      type,
      ({ label, href }) => label === "TextInput" && href.startsWith("/reference/"),
      "TextInput overview",
    ),
  );
  const member = await retrieve(
    requireLink(type, ({ label }) => label === "appendText", "appendText member"),
  );
  if (
    !overview.includes("TextInput") ||
    !member.includes("appendText") ||
    !member.includes("Unreleased")
  )
    throw new Error("Wrong production API content");
  const bundles = await retrieve("/indexes/bundles.md");
  for (const kind of ["sections", "packages"])
    requireLink(bundles, ({ href }) => href.startsWith(`/bundles/${kind}/`), `${kind} bundle`);
  requireLink(bundles, ({ href }) => href === "/llms-full.txt", "full-corpus bundle");
  for (const bundle of links(bundles)) {
    const body = await retrieve(bundle.href);
    if (!body.includes("<!-- BEGIN DOCUMENT:") || !body.includes("<!-- END DOCUMENT:"))
      throw new Error(`Incomplete bundle: ${bundle.href}`);
  }
  const full = await retrieve("/llms-full.txt");
  // Check outgoing links of the selected resources, without recursively crawling
  // the complete API corpus. Full artifact coverage belongs to docs:check.
  const selected = [...checked].filter(([, body]) =>
    [guide, type, overview, member].includes(body),
  );
  for (const [source, body] of selected) {
    for (const link of links(body)) {
      const target = new URL(link.href, source);
      if (target.origin !== base.origin) continue;
      const text = await retrieve(target.href);
      if (target.hash && !anchors(text).has(decodeURIComponent(target.hash.slice(1))))
        throw new Error(`Broken Markdown anchor in ${source}: ${link.href}`);
    }
  }
  for (const canonical of [guide, overview, member])
    if (!full.includes(canonical.trim())) throw new Error("Incomplete full corpus");
  for (const bundle of links(bundles)) {
    const body = await retrieve(bundle.href);
    const documents = [
      ...body.matchAll(/<!-- BEGIN DOCUMENT: ([^\n]+) -->[\s\S]*?<!-- END DOCUMENT: \1 -->/g),
    ];
    if (!documents.length || documents.some(([document]) => !full.includes(document)))
      throw new Error(`Bundle differs from full corpus: ${bundle.href}`);
  }
  return [...checked.keys()].map((url) => new URL(url).pathname);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const checked = await checkLive(
    process.argv[2] ?? "https://pomeranian.lolma.us",
    process.argv[3],
  );
  console.log(`Validated ${checked.length} live documentation resources`);
}
