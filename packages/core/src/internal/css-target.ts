export function cssTarget(input: string): string {
  let body = input.trim();
  const engine = /^([\w:+*-]+)\s*=/.exec(body);
  if (engine) {
    if (engine[1] !== "css") throw new Error("String targets must use one CSS selector body.");
    body = body.slice(engine[0].length).trim();
  }
  if (!body || /^\(*\/\//.test(body) || body.startsWith("..") || /^["'`]/.test(body)) {
    throw new Error("A non-empty CSS selector body is required.");
  }
  let quote: string | undefined;
  for (let index = 0; index < body.length; index++) {
    const char = body[index];
    if (char === "\\") {
      index++;
    } else if (quote === char) {
      quote = undefined;
    } else if (!quote && (char === '"' || char === "'" || char === "`")) {
      quote = char;
    } else if (!quote && char === ">" && body[index + 1] === ">") {
      throw new Error("CSS string targets do not support selector-engine chains.");
    }
  }
  return `css=${body}`;
}
