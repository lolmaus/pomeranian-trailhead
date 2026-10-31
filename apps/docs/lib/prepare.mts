import type { content } from "./content.mts";
import type { reference } from "./reference.mts";

export interface ContentPage {
  path: string;
  origin: "authored" | "reference";
  document: ReturnType<typeof content>;
}

export async function prepare(output: string) {
  return {
    site: output,
    pages: [] as ContentPage[],
    api: null as Awaited<ReturnType<typeof reference>> | null,
  };
}
