import MarkdownIt from "markdown-it";

const parser = new MarkdownIt({ html: true });

export function content(source: string) {
  const tokens = parser.parse(source, {});
  const headings = tokens.flatMap((token, index) =>
    token.type === "heading_open" ? [tokens[index + 1]?.content ?? ""] : [],
  );
  return { markdown: source, headings, tokens };
}
