import type { SymbolInfo, GraphEdge, GraphNode } from "@codeforge/shared";
import { chunkSymbols, searchLocal } from "@codeforge/rag";

export function codeSearch(
  chunks: ReturnType<typeof chunkSymbols>,
  query: string,
  limit = 4
) {
  return searchLocal(chunks, query, limit);
}

export function graphNeighbors(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
) {
  const outgoing = edges.filter((e) => e.from === nodeId).map((e) => e.to);
  const incoming = edges.filter((e) => e.to === nodeId).map((e) => e.from);
  return {
    node: nodes.find((n) => n.id === nodeId) || null,
    callers: incoming,
    callees: outgoing,
  };
}

export function readSymbol(symbols: SymbolInfo[], file: string, name: string) {
  return symbols.find((s) => s.file === file && s.name === name) || null;
}
