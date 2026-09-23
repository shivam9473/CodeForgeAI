import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import type { SourceFile, SymbolInfo, GraphNode, GraphEdge } from "@codeforge/shared";

const traverse = (_traverse as unknown as { default: typeof _traverse }).default || _traverse;

export function readSourceTree(root: string, limit = 80): SourceFile[] {
  const files: SourceFile[] = [];
  const walk = (dir: string) => {
    if (files.length >= limit) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) {
        files.push({
          path: path.relative(root, full).replaceAll("\\", "/"),
          content: fs.readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(root);
  return files;
}

export function parseFiles(files: SourceFile[]): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];
  for (const file of files) {
    let ast;
    try {
      ast = parse(file.content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        errorRecovery: true,
      });
    } catch {
      continue;
    }
    traverse(ast, {
      FunctionDeclaration(p) {
        const name = p.node.id?.name;
        if (!name || !p.node.loc) return;
        const start = p.node.start ?? 0;
        const end = p.node.end ?? start;
        symbols.push({
          file: file.path,
          name,
          params: p.node.params.map((param) => file.content.slice(param.start ?? 0, param.end ?? 0)),
          line: p.node.loc.start.line,
          endLine: p.node.loc.end.line,
          body: file.content.slice(start, end),
        });
      },
      VariableDeclarator(p) {
        if (p.node.id.type !== "Identifier") return;
        if (
          p.node.init?.type !== "ArrowFunctionExpression" &&
          p.node.init?.type !== "FunctionExpression"
        ) {
          return;
        }
        if (!p.node.loc || p.node.start == null || p.node.end == null) return;
        symbols.push({
          file: file.path,
          name: p.node.id.name,
          params: p.node.init.params.map((param) => file.content.slice(param.start ?? 0, param.end ?? 0)),
          line: p.node.loc.start.line,
          endLine: p.node.loc.end.line,
          body: file.content.slice(p.node.start, p.node.end),
        });
      },
    });
  }
  return symbols;
}

export function callsIn(body: string): string[] {
  const names = new Set<string>();
  const re = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    if (!["if", "for", "while", "switch", "catch", "function"].includes(match[1])) {
      names.add(match[1]);
    }
  }
  return [...names];
}

export function buildGraph(symbols: SymbolInfo[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const byName = new Map<string, SymbolInfo>();
  for (const symbol of symbols) {
    if (!byName.has(symbol.name)) byName.set(symbol.name, symbol);
  }
  const nodes = symbols.map((symbol) => ({
    id: `${symbol.file}:${symbol.name}`,
    name: symbol.name,
    file: symbol.file,
    line: symbol.line,
  }));
  const edges: GraphEdge[] = [];
  for (const symbol of symbols) {
    for (const call of callsIn(symbol.body)) {
      const target = byName.get(call);
      if (!target || target === symbol) continue;
      edges.push({
        from: `${symbol.file}:${symbol.name}`,
        to: `${target.file}:${target.name}`,
        call,
      });
    }
  }
  return { nodes, edges };
}
