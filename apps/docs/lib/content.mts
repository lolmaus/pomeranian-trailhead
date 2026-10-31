import MarkdownIt from "markdown-it";

const parser = new MarkdownIt({ html: true });

export function content(source: string, examples: Record<string, string> = {}) {
  const included: { path: string; region: string; code: string }[] = [];
  const sourceLines = source.split("\n");
  for (const token of parser.parse(source, {}).toReversed()) {
    if (token.type !== "html_block" || !token.map) continue;
    const match = /^<!-- @example (examples\/[\w/.-]+\.mts)#([\w-]+) -->\s*$/.exec(token.content);
    if (!match) continue;
    const filename = match[1] ?? "";
    const region = match[2] ?? "";
    const example = examples[filename];
    if (!example) throw new Error(`Unknown checked example: ${filename}`);
    const exampleLines = example.split("\n");
    const start = exampleLines.flatMap((line, i) =>
      line.trim() === `// #region ${region}` ? [i] : [],
    );
    const end = exampleLines.flatMap((line, i) =>
      line.trim() === `// #endregion ${region}` ? [i] : [],
    );
    if (start.length !== 1 || end.length !== 1 || (start[0] ?? 0) >= (end[0] ?? 0)) {
      throw new Error(`Missing, duplicate or unclosed example region: ${filename}#${region}`);
    }
    const code = exampleLines.slice((start[0] ?? 0) + 1, end[0]).join("\n");
    const fenceLength = Math.max(3, ...[...code.matchAll(/`+/g)].map((item) => item[0].length + 1));
    const delimiter = "`".repeat(fenceLength);
    sourceLines.splice(
      token.map[0],
      token.map[1] - token.map[0],
      `${delimiter}ts\n${code}\n${delimiter}`,
    );
    included.unshift({ path: filename, region, code });
  }
  const lines: string[] = [];
  let callout = false;
  let fence = "";
  for (const line of sourceLines.join("\n").split("\n")) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = "";
    } else if (!fence && /^ {0,3}:::/.test(line)) {
      if (line.trim() === ":::") {
        if (!callout) throw new Error("Unexpected container end");
        callout = false;
        lines.push("");
        continue;
      }
      const match = /^ {0,3}::: (note|tip|info|warning|danger)(?: (.*))?$/.exec(line);
      if (!match || callout) throw new Error(`Unsupported container: ${line}`);
      callout = true;
      const kind = match[1] ?? "note";
      const title = kind[0]?.toUpperCase() + kind.slice(1);
      lines.push(`> **${title}${match[2] ? `: ${match[2]}` : ""}**`, ">");
      continue;
    }
    lines.push(callout ? `> ${line}` : line);
  }
  if (callout) throw new Error("Unclosed container");
  if (fence) throw new Error("Unclosed code fence");
  const markdown = lines.join("\n");
  const tokens = parser.parse(markdown, {});
  for (const token of tokens.flatMap((item) => [item, ...(item.children ?? [])])) {
    if (token.type === "html_block" || token.type === "html_inline") {
      throw new Error(`Unsupported HTML: ${token.content}`);
    }
    if (token.type === "image" || (token.type === "text" && /{{|}}/.test(token.content))) {
      throw new Error(`Unsupported dynamic or image content: ${token.content}`);
    }
  }
  if (/^---\s*\n/.test(markdown))
    throw new Error("Frontmatter is not supported; write substantive content in Markdown");
  const headings = tokens.flatMap((token, index) =>
    token.type === "heading_open" ? [tokens[index + 1]?.content ?? ""] : [],
  );
  const links = tokens
    .flatMap((token) => token.children ?? [])
    .flatMap((token) => (token.type === "link_open" ? [token.attrGet("href") ?? ""] : []));
  return { markdown, headings, tokens, links, examples: included };
}
