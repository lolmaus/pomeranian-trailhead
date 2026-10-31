import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { parse, type DefaultTreeAdapterTypes } from "parse5";

export async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const filename = path.join(directory, entry.name);
      return entry.isDirectory() ? files(filename) : [filename];
    }),
  );
  return nested.flat().sort();
}

export async function checkHtml(directory: string) {
  const documents = new Map<string, { ids: Set<string>; links: string[] }>();
  for (const filename of (await files(directory)).filter((file) => file.endsWith(".html"))) {
    const ids = new Set<string>();
    const links: string[] = [];
    function visit(node: DefaultTreeAdapterTypes.Node) {
      if ("attrs" in node) {
        for (const attr of node.attrs) {
          if (attr.name === "id" || (node.nodeName === "a" && attr.name === "name"))
            ids.add(attr.value);
          if (attr.name === "href") links.push(attr.value);
        }
      }
      if ("childNodes" in node) for (const child of node.childNodes) visit(child);
    }
    visit(parse(await readFile(filename, "utf8")));
    documents.set(filename, { ids, links });
  }
  if (!documents.size) throw new Error("No built HTML to validate");
  for (const [filename, document] of documents) {
    const relative = path.relative(directory, filename).split(path.sep).join("/");
    for (const href of document.links) {
      const url = new URL(href, `https://pomeranian.lolma.us/${relative}`);
      if (url.origin !== "https://pomeranian.lolma.us") continue;
      const pathname = decodeURIComponent(url.pathname);
      let target = path.resolve(directory, `.${pathname}`);
      if (
        !target.startsWith(path.resolve(directory) + path.sep) &&
        target !== path.resolve(directory)
      )
        throw new Error(`Escaping HTML link in ${relative}: ${href}`);
      let entry = await stat(target).catch(() => undefined);
      if (entry?.isDirectory()) target = path.join(target, "index.html");
      else if (!entry && !path.extname(target)) target += ".html";
      entry = await stat(target).catch(() => undefined);
      if (!entry?.isFile()) throw new Error(`Broken HTML link in ${relative}: ${href}`);
      const anchor = decodeURIComponent(url.hash.slice(1));
      if (anchor && !documents.get(target)?.ids.has(anchor))
        throw new Error(`Broken HTML anchor in ${relative}: ${href}`);
    }
  }
  return documents.size;
}
