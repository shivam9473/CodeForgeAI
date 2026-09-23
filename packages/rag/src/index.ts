import type { SymbolInfo } from "@codeforge/shared";

export function embed(text: string): number[] {
  const vector = new Array(16).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) hash = (hash * 33 + token.charCodeAt(i)) >>> 0;
    vector[hash % vector.length] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, n) => sum + n * n, 0)) || 1;
  return vector.map((n) => Number((n / norm).toFixed(4)));
}

export function chunkSymbols(symbols: SymbolInfo[]) {
  return symbols.map((symbol) => ({
    id: `${symbol.file}:${symbol.name}`,
    file: symbol.file,
    symbol: symbol.name,
    content: symbol.body.trim().slice(0, 1200),
    embedding: embed(`${symbol.name}\n${symbol.body}`),
  }));
}

export function searchLocal(
  chunks: ReturnType<typeof chunkSymbols>,
  query: string,
  limit = 4
) {
  const q = embed(query);
  return chunks
    .map((chunk) => ({
      id: chunk.id,
      score: cosine(q, chunk.embedding),
      file: chunk.file,
      symbol: chunk.symbol,
      content: chunk.content,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Number(dot.toFixed(4));
}
