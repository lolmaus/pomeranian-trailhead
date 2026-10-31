import MarkdownIt from "markdown-it";

const parser = new MarkdownIt({ html: true });

export function content(source: string) {
  const lines: string[] = [];
  let callout = false;
  let fence = "";
  for (const line of source.split("\n")) {
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
  }
  const headings = tokens.flatMap((token, index) =>
    token.type === "heading_open" ? [tokens[index + 1]?.content ?? ""] : [],
  );
  return { markdown, headings, tokens };
}
