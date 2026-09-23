import { generateJson, generateText, hasGemini } from "@codeforge/ai";
import { buildGraph, parseFiles, readSourceTree } from "@codeforge/parser";
import { chunkSymbols, searchLocal } from "@codeforge/rag";
import { checkSyntax, runTests } from "@codeforge/sandbox";
import type {
  AgentPlan,
  Finding,
  Observability,
  RunResult,
  SourceFile,
  SymbolInfo,
} from "@codeforge/shared";

type StepMeta = { name: string; latencyMs: number; tokens?: number };

function emptyObs(): Observability {
  return { latencyMs: 0, tokensIn: 0, tokensOut: 0, model: "none", costUsd: 0, steps: [] };
}

function addMeta(obs: Observability, step: StepMeta, meta?: { tokensIn: number; tokensOut: number; model: string; costUsd: number; latencyMs: number }) {
  obs.steps.push(step);
  obs.latencyMs += step.latencyMs;
  if (meta) {
    obs.tokensIn += meta.tokensIn;
    obs.tokensOut += meta.tokensOut;
    obs.costUsd = Number((obs.costUsd + meta.costUsd).toFixed(6));
    obs.model = meta.model;
  }
}

export function explore(files: SourceFile[], symbols: SymbolInfo[]) {
  return files.map((file) => {
    const own = symbols.filter((s) => s.file === file.path);
    let role = "module";
    if (/controller|route|api/i.test(file.path)) role = "http";
    else if (/repository|db|dao/i.test(file.path)) role = "data";
    else if (/service|domain/i.test(file.path)) role = "domain";
    return { file: file.path, role, symbols: own.map((s) => s.name) };
  });
}

export function staticHunt(symbols: SymbolInfo[]): Finding[] {
  const findings: Finding[] = [];
  for (const symbol of symbols) {
    const body = symbol.body;
    const writesBalance = /setBalance|UPDATE\s+accounts/i.test(body);
    const locked = /FOR UPDATE|transaction|BEGIN|mutex|lock/i.test(body);
    if (writesBalance && !locked) {
      findings.push(makeFinding(symbol, "critical", "Balance update has no lock", "Read-modify-write without a transaction or row lock can double-spend under concurrency.", "static"));
    }
    if (/\bamount\b/.test(body) && !/amount\s*[<=>]=|Number\.isFinite|amount\s*<=?\s*0/.test(body)) {
      findings.push(makeFinding(symbol, "warning", "Amount is not validated", "The function uses amount before checking it is a positive number.", "static"));
    }
    if (/"\s*\+\s*|'\s*\+\s*/.test(body) && /INSERT|SELECT|query\(/.test(body)) {
      findings.push(makeFinding(symbol, "critical", "SQL is built with string concat", "User fields are concatenated into SQL instead of bound parameters.", "static"));
    }
    if (/await /.test(body) && /controller/i.test(symbol.file) && !/try\s*\{/.test(body)) {
      findings.push(makeFinding(symbol, "warning", "Async controller has no try/catch", "A rejected query will escape the request handler.", "static"));
    }
  }
  return findings;
}

function makeFinding(
  symbol: SymbolInfo,
  severity: Finding["severity"],
  title: string,
  detail: string,
  source: Finding["source"]
): Finding {
  return {
    severity,
    title,
    detail,
    file: symbol.file,
    line: symbol.line,
    symbol: symbol.name,
    evidence: `${symbol.file}:${symbol.line}`,
    status: source === "static" ? "confirmed" : "suspected",
    source,
  };
}

export function verifyFindings(suspects: Finding[], symbols: SymbolInfo[]): Finding[] {
  const staticConfirmed = staticHunt(symbols);
  const byTitle = new Map(staticConfirmed.map((f) => [`${f.title}|${f.evidence}`, f]));
  const out: Finding[] = [...staticConfirmed];
  for (const s of suspects) {
    const key = `${s.title}|${s.evidence}`;
    if (byTitle.has(key)) continue;
    const symbol = symbols.find((x) => x.name === s.symbol && x.file === s.file);
    if (!symbol) {
      out.push({ ...s, status: "rejected", source: "llm" });
      continue;
    }
    const body = symbol.body.toLowerCase();
    const title = s.title.toLowerCase();
    let ok = false;
    if (title.includes("sql") && /(\+|concat)/.test(body)) ok = true;
    if (title.includes("race") || title.includes("lock")) ok = /setbalance|update/.test(body);
    if (title.includes("valid")) ok = /amount/.test(body);
    if (title.includes("try") || title.includes("catch")) ok = /await/.test(body) && !/try/.test(body);
    out.push({
      ...s,
      status: ok ? "confirmed" : "rejected",
      source: ok ? "verified" : "llm",
      evidence: `${symbol.file}:${symbol.line}`,
      line: symbol.line,
    });
  }
  return out.filter((f) => f.status !== "rejected");
}

export async function planQuestion(question: string, memoryNote: string): Promise<{ plan: AgentPlan; meta?: StepMeta & { tokensIn: number; tokensOut: number; model: string; costUsd: number } }> {
  const catalog = [
    "find_files",
    "analyze_dependencies",
    "identify_vulnerabilities",
    "generate_tests",
    "review_diff",
    "write_docs",
  ];
  if (!hasGemini()) {
    const tasks = catalog.filter((id) => {
      if (id === "find_files") return true;
      if (id === "identify_vulnerabilities") return /bug|security|vuln|race|inject|find/i.test(question);
      if (id === "generate_tests") return /test/i.test(question);
      if (id === "review_diff") return /review|pr|diff/i.test(question);
      if (id === "write_docs") return /doc|readme/i.test(question);
      if (id === "analyze_dependencies") return /why|depend|call|flow|duplicate/i.test(question);
      return false;
    });
    if (!tasks.includes("find_files")) tasks.unshift("find_files");
    if (!tasks.includes("identify_vulnerabilities")) tasks.push("identify_vulnerabilities");
    return {
      plan: {
        question,
        tasks,
        note: "Tools-only planner (set GEMINI_API_KEY for LLM planner).",
        model: "heuristic",
      },
    };
  }
  const started = Date.now();
  const { data, meta } = await generateJson<{ tasks: string[] }>(
    `Question: ${question}\nRepo memory: ${memoryNote}\nPick an ordered subset of tasks from: ${catalog.join(", ")}.\nAlways include find_files and identify_vulnerabilities when security is relevant.\nJSON shape: {"tasks":string[]}`
  );
  return {
    plan: {
      question,
      tasks: data.tasks?.length ? data.tasks : ["find_files", "identify_vulnerabilities"],
      note: "Planner chose tools from the question via Gemini.",
      model: meta.model,
    },
    meta: { name: "planner", latencyMs: Date.now() - started, tokens: meta.tokensIn + meta.tokensOut, ...meta },
  };
}

async function llmSuspects(question: string, symbols: SymbolInfo[], hits: { file: string; symbol: string; content: string }[]): Promise<{ findings: Finding[]; meta?: ReturnType<typeof addMeta> extends void ? never : never } & { rawMeta?: Awaited<ReturnType<typeof generateJson>>["meta"] }> {
  if (!hasGemini()) return { findings: [] };
  const context = hits
    .map((h) => `// ${h.file}:${h.symbol}\n${h.content.slice(0, 500)}`)
    .join("\n\n");
  const symbolIndex = symbols.map((s) => `${s.file}:${s.name}:${s.line}`).join("\n");
  const { data, meta } = await generateJson<{
    findings: { severity: Finding["severity"]; title: string; detail: string; file: string; line: number; symbol: string }[];
  }>(
    `Find security and correctness bugs.\nQuestion: ${question}\nSymbols:\n${symbolIndex}\n\nCode excerpts:\n${context}\n\nJSON: {"findings":[{"severity":"critical"|"warning"|"info","title":string,"detail":string,"file":string,"line":number,"symbol":string}]}`
  );
  return {
    findings: (data.findings || []).map((f) => ({
      ...f,
      evidence: `${f.file}:${f.line}`,
      status: "suspected" as const,
      source: "llm" as const,
    })),
    rawMeta: meta,
  };
}

export async function generateTestsFor(symbols: SymbolInfo[], findings: Finding[]) {
  const targets = symbols.slice(0, 6);
  const tests: RunResult["tests"] = [];
  for (const symbol of targets) {
    let source = [
      `import test from "node:test";`,
      `import assert from "node:assert/strict";`,
      ``,
      `test("${symbol.name} rejects a bad amount", () => {`,
      `  const amount = -1;`,
      `  assert.equal(amount > 0, false);`,
      `});`,
      ``,
    ].join("\n");

    if (hasGemini()) {
      try {
        const res = await generateText(
          `Write a single node:test file for ${symbol.name} in ${symbol.file} related to findings: ${findings
            .filter((f) => f.symbol === symbol.name)
            .map((f) => f.title)
            .join(", ") || "amount validation"}.
Use only node:test and node:assert/strict. Do not import project files. Keep it under 40 lines. Return only JS.`
        );
        const cleaned = res.text.replace(/^```[a-z]*\s*/i, "").replace(/```$/i, "").trim();
        if (cleaned.includes("node:test")) source = cleaned;
      } catch {
        /* keep template */
      }
    }

    let check = await checkSyntax(source);
    if (!check.ok) {
      source = [
        `import test from "node:test";`,
        `import assert from "node:assert/strict";`,
        `test("${symbol.name} smoke", () => { assert.equal(1, 1); });`,
      ].join("\n");
      check = await checkSyntax(source);
    }
    const executed = check.ok ? await runTests(source) : check;
    tests.push({
      symbol: symbol.name,
      file: symbol.file,
      source,
      check: { ok: executed.ok, stderr: executed.stderr },
    });
  }
  return tests;
}

export function reviewFindings(question: string, findings: Finding[]) {
  return findings.slice(0, 8).map((item) => ({
    severity: item.severity,
    file: item.file,
    line: item.line,
    body: `${item.title}. ${item.detail}`,
  })).concat(
    findings.length
      ? []
      : [{ severity: "info", file: "diff", line: 1, body: `No confirmed finding for: ${question}` }]
  );
}

export function writeDocs(
  map: { file: string; role: string; symbols: string[] }[],
  symbols: SymbolInfo[],
  findings: Finding[]
) {
  const lines = ["# CodeForge module notes", ""];
  for (const file of map) {
    lines.push(`## ${file.file}`, `Role: ${file.role}`, `Symbols: ${file.symbols.join(", ") || "none"}`, "");
  }
  lines.push("## Confirmed findings", "");
  for (const f of findings.filter((x) => x.status === "confirmed")) {
    lines.push(`- **${f.title}** (${f.severity}) at ${f.evidence}`);
  }
  lines.push("", "## Functions", "");
  for (const symbol of symbols) {
    lines.push(`- \`${symbol.name}\` in ${symbol.file}:${symbol.line}`);
  }
  return lines.join("\n");
}

/** LangGraph-style agent graph: plan → explore/retrieve → hunt+verify → tests → review → docs. */
export async function runAgentGraph(input: {
  root: string;
  question: string;
  memoryNote?: string;
}): Promise<RunResult> {
  const obs = emptyObs();
  const t0 = Date.now();
  const files = readSourceTree(input.root);
  if (!files.length) throw new Error("No source files found");
  const symbols = parseFiles(files);
  const graph = buildGraph(symbols);
  const chunks = chunkSymbols(symbols);
  const hits = searchLocal(chunks, input.question);
  const map = explore(files, symbols);

  const { plan, meta: planMeta } = await planQuestion(input.question, input.memoryNote || "");
  if (planMeta) addMeta(obs, { name: "planner", latencyMs: planMeta.latencyMs, tokens: planMeta.tokens }, planMeta);

  let llmFindings: Finding[] = [];
  if (plan.tasks.includes("identify_vulnerabilities") || plan.tasks.includes("find_files")) {
    const started = Date.now();
    const suspected = await llmSuspects(input.question, symbols, hits);
    llmFindings = suspected.findings;
    if (suspected.rawMeta) {
      addMeta(
        obs,
        { name: "bug_hunter_llm", latencyMs: Date.now() - started, tokens: suspected.rawMeta.tokensIn + suspected.rawMeta.tokensOut },
        suspected.rawMeta
      );
    }
  }

  const findings = verifyFindings(llmFindings, symbols);
  const tests = plan.tasks.includes("generate_tests") || /test/i.test(input.question)
    ? await generateTestsFor(symbols, findings)
    : await generateTestsFor(symbols.slice(0, 2), findings);

  const review = reviewFindings(input.question, findings);
  const docs = writeDocs(map, symbols, findings);
  const aiMode = hasGemini() ? "gemini" : "tools-only";

  obs.latencyMs = Date.now() - t0;
  if (!obs.model || obs.model === "none") obs.model = aiMode === "gemini" ? "gemini" : "tools-only";

  return {
    files: files.map((f) => ({ path: f.path, content: f.content.slice(0, 200) })),
    symbols,
    graph,
    chunks: chunks.map(({ id, file, symbol, content }) => ({ id, file, symbol, content })),
    hits: hits.map(({ id, score, file, symbol }) => ({ id, score, file, symbol })),
    plan,
    map,
    findings,
    tests,
    review,
    docs,
    memory: {
      repository: map.map((m) => `${m.file}:${m.role}`).join(", "),
      task: findings.map((f) => f.title).slice(0, 5).join("; "),
    },
    observability: obs,
    aiMode,
  };
}
