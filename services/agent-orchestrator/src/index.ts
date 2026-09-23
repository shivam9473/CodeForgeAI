import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgentGraph } from "@codeforge/agents";
import { getStore } from "@codeforge/database";
import { buildGraph, parseFiles, readSourceTree } from "@codeforge/parser";
import { createMemoryBroker, QUEUES } from "@codeforge/queues";
import { chunkSymbols, searchLocal } from "@codeforge/rag";
import type { JobEvent, JobState, RunRecord, RunResult } from "@codeforge/shared";

const fixtureRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../fixtures/payment"
);

export type Broadcaster = (event: JobEvent | { type: "run"; run: RunRecord }) => void;

export function defaultRoot() {
  return process.env.FIXTURE_ROOT?.trim() || fixtureRoot;
}

export async function startPipeline(run: RunRecord, broadcast?: Broadcaster) {
  const store = await getStore();
  const state: Partial<RunResult> & { root: string } = {
    root: run.root || defaultRoot(),
    files: [],
    symbols: [],
    graph: { nodes: [], edges: [] },
    chunks: [],
    hits: [],
    plan: null,
    map: [],
    findings: [],
    tests: [],
    review: [],
    docs: "",
    memory: { repository: "", task: "" },
    observability: { latencyMs: 0, tokensIn: 0, tokensOut: 0, model: "none", costUsd: 0, steps: [] },
    aiMode: "tools-only",
  };

  const setStep = async (name: string, stateName: JobState) => {
    const row = run.steps.find((s) => s.name === name);
    if (row) row.state = stateName;
    await store.saveRun(run);
    broadcast?.({ type: "run", run });
  };

  const onEvent = async (event: JobEvent) => {
    await store.addJobEvent(event);
    await setStep(event.name, event.state);
    broadcast?.(event);
  };

  const broker = createMemoryBroker(
    {
      [QUEUES.INGEST]: async () => {
        state.files = readSourceTree(state.root);
        if (!state.files.length) throw new Error("No source files");
        await store.upsertRepository("local", path.basename(state.root), state.root);
      },
      [QUEUES.ANALYSIS]: async () => {
        state.symbols = parseFiles(state.files || []);
        state.graph = buildGraph(state.symbols);
      },
      [QUEUES.EMBED]: async () => {
        const chunks = chunkSymbols(state.symbols || []);
        state.chunks = chunks.map(({ id, file, symbol, content }) => ({ id, file, symbol, content }));
        state.hits = searchLocal(chunks, run.question).map(({ id, score, file, symbol }) => ({
          id,
          score,
          file,
          symbol,
        }));
        await store.replaceChunks(
          "local",
          chunks.map((c) => ({
            id: c.id,
            repositoryId: "local",
            file: c.file,
            symbol: c.symbol,
            content: c.content,
            embedding: c.embedding,
          }))
        );
      },
      [QUEUES.AI]: async () => {
        const memories = await store.listMemory("repository", "local");
        const agent = await runAgentGraph({
          root: state.root,
          question: run.question,
          memoryNote: memories.map((m) => m.content).join(" | "),
        });
        Object.assign(state, agent);
        await store.saveMemory("repository", agent.memory.repository, "local");
        await store.saveMemory("task", agent.memory.task, "local");
        await store.saveFindings(run.id, agent.findings);
      },
      [QUEUES.TESTS]: async () => {
        /* tests already produced in AI graph; keep job for board visibility */
        if (!state.tests?.length) {
          const agent = await runAgentGraph({ root: state.root, question: run.question + " generate tests" });
          state.tests = agent.tests;
        }
      },
      [QUEUES.REVIEW]: async () => {
        if (!state.review?.length && state.findings) {
          state.review = state.findings.slice(0, 8).map((item) => ({
            severity: item.severity,
            file: item.file,
            line: item.line,
            body: `${item.title}. ${item.detail}`,
          }));
        }
      },
      [QUEUES.DOCS]: async () => {
        if (!state.docs) {
          state.docs = "# docs\n";
        }
      },
    },
    onEvent
  );

  const ingest = broker.add(QUEUES.INGEST, { runId: run.id }, { id: "ingest", runId: run.id, priority: "high" });
  const analysis = broker.add(QUEUES.ANALYSIS, { runId: run.id }, {
    id: "analysis",
    runId: run.id,
    dependsOn: [ingest.id],
    priority: "high",
  });
  const embed = broker.add(QUEUES.EMBED, { runId: run.id }, {
    id: "embed",
    runId: run.id,
    dependsOn: [analysis.id],
    priority: "medium",
  });
  const ai = broker.add(QUEUES.AI, { runId: run.id }, {
    id: "ai",
    runId: run.id,
    dependsOn: [embed.id],
    priority: "high",
  });
  broker.add(QUEUES.TESTS, { runId: run.id }, { id: "tests", runId: run.id, dependsOn: [ai.id], priority: "medium" });
  broker.add(QUEUES.REVIEW, { runId: run.id }, { id: "review", runId: run.id, dependsOn: [ai.id], priority: "medium" });
  const docs = broker.add(QUEUES.DOCS, { runId: run.id }, { id: "docs", runId: run.id, dependsOn: [ai.id], priority: "low" });

  await broker.waitFor([docs.id, "tests", "review"]);
  const snap = broker.snapshot();
  const failed = snap.jobs.some((j) => j.state === "failed");
  run.status = failed ? "failed" : "completed";
  run.result = {
    ...(state as RunResult),
    queue: snap,
  };
  await store.saveRun(run);
  broadcast?.({ type: "run", run });
  return run;
}
