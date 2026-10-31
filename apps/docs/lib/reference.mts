export interface Source {
  package: string;
  entry: string;
  status: "development" | "production" | "fixture";
}

export interface SymbolEntry {
  key: string;
  name: string;
  package: string;
  kind: string;
  html: string;
  signatures: number;
  inherited: boolean;
  protected: boolean;
  history: string[];
}

export async function reference(sources: Source[], output: string) {
  void sources;
  void output;
  return { symbols: [] as SymbolEntry[], ownerByReflection: {} as Record<string, string> };
}
