import MarkdownIt from "markdown-it";

const parser = new MarkdownIt({ html: true });

export function content(source: string) {
  const tokens = parser.parse(source, {});
  for (const token of tokens.flatMap((item) => [item, ...(item.children ?? [])])) {
    if (token.type === "html_block" || token.type === "html_inline") {
      throw new Error(`Unsupported HTML: ${token.content}`);
    }
  }
  const headings = tokens.flatMap((token, index) =>
    token.type === "heading_open" ? [tokens[index + 1]?.content ?? ""] : [],
  );
  return { markdown: source, headings, tokens };
}
