"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Editor from "@monaco-editor/react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000/ws";

const PRESETS = [
  "Find security vulnerabilities and generate tests for the payment module",
  "Why can payment creation create duplicate transactions?",
  "Review the payment flow and update the docs",
];

type Run = {
  id: string;
  question: string;
  status: string;
  steps: { name: string; state: string }[];
  result: any;
};

function stepDot(state: string) {
  if (state === "completed") return "bg-quench";
  if (state === "active" || state === "delayed") return "bg-ember shadow-[0_0_0_4px_rgb(255_122_47/0.18)]";
  if (state === "failed") return "bg-bad";
  return "bg-mute/50";
}

function severityBadge(severity: string) {
  if (severity === "critical") return "bg-bad/15 text-bad";
  if (severity === "warning") return "bg-warn/15 text-warn";
  return "bg-quench/15 text-quench";
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={`card flex flex-col p-5 ${className}`}>
      <h2 className="text-base font-bold">{title}</h2>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </article>
  );
}

function Pill({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3.5 py-1.5 text-xs">
      <span className={`h-1.5 w-1.5 rounded-full ${good ? "bg-quench" : "bg-mute/60"}`} />
      <span className="text-mute">{label}</span>
      <span className="font-bold">{value}</span>
    </span>
  );
}

export default function Desk() {
  const [question, setQuestion] = useState(PRESETS[0]);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wsState, setWsState] = useState("offline");
  const [selected, setSelected] = useState<{ id: string; code: string; label: string } | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let alive = true;
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => alive && setWsState("live");
      ws.onclose = () => alive && setWsState("offline");
      ws.onerror = () => alive && setWsState("offline");
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.type === "run" && data.run) {
            setRun((prev) => (prev && prev.id !== data.run.id ? prev : data.run));
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      setWsState("offline");
    }
    return () => {
      alive = false;
      ws?.close();
    };
  }, []);

  useEffect(() => {
    if (!run || run.status !== "running") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API}/runs/${run.id}`);
        if (res.ok) setRun(await res.json());
      } catch {
        /* the next tick retries */
      }
    }, 600);
    return () => clearInterval(timer);
  }, [run?.id, run?.status]);

  async function launch() {
    setBusy(true);
    setError("");
    setSelected(null);
    try {
      const res = await fetch(`${API}/repositories/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Import failed");
      setRun({ id: body.id, status: "running", question, steps: [], result: null });
    } catch (err) {
      if (err instanceof TypeError) {
        setError(`Cannot reach the API at ${API}. Start everything with npm run dev, then try again.`);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const result = run?.result;
  const findings = result?.findings || [];
  const jobs = result?.queue?.jobs || [];
  const obs = result?.observability;

  const nodes: Node[] = useMemo(() => {
    const list = result?.graph?.nodes || [];
    return list.map((node: any, index: number) => ({
      id: node.id,
      position: { x: 40 + (index % 2) * 220, y: 20 + Math.floor(index / 2) * 90 },
      data: { label: `${node.name}\n${node.file}` },
      style: {
        background: "#16223a",
        color: "#eef2fa",
        border: "1px solid #24314b",
        borderRadius: 12,
        padding: 10,
        fontSize: 12,
        whiteSpace: "pre-line",
      },
    }));
  }, [result?.graph?.nodes]);

  const edges: Edge[] = useMemo(() => {
    return (result?.graph?.edges || []).map((edge: any) => ({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      animated: true,
      style: { stroke: "#ff7a2f" },
    }));
  }, [result?.graph?.edges]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const symbol = (result?.symbols || []).find((s: any) => `${s.file}:${s.name}` === node.id);
      setSelected({ id: node.id, label: node.id, code: symbol?.body || `// No body for ${node.id}` });
    },
    [result?.symbols],
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Review desk</h1>
          <p className="mt-2 max-w-xl text-mute">Ask a question about the code, watch the jobs run, and review what survives verification.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill label="WebSocket" value={wsState} good={wsState === "live"} />
          <Pill label="Run" value={run ? run.status : "idle"} good={run?.status === "completed"} />
          <Pill label="Model" value={result?.aiMode || "none"} />
        </div>
      </div>

      <section className="mt-8">
        <label htmlFor="question" className="mb-2 block text-sm font-bold">
          Question
        </label>
        <textarea id="question" className="input resize-y leading-relaxed" value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {PRESETS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setQuestion(text)}
              className="max-w-full rounded-full border border-line px-3.5 py-1.5 text-left text-xs text-mute transition-colors hover:border-ember hover:text-paper"
            >
              {text}
            </button>
          ))}
          <button type="button" onClick={launch} disabled={busy} className="btn-ember ml-auto">
            {busy ? "Queuing…" : "Run pipeline"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">
            {error}
          </p>
        )}
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Run metrics">
        {[
          ["Latency", `${obs?.latencyMs ?? 0} ms`],
          ["Tokens", String((obs?.tokensIn ?? 0) + (obs?.tokensOut ?? 0))],
          ["Model", obs?.model ?? "none"],
          ["Cost", `$${obs?.costUsd ?? 0}`],
        ].map(([label, value]) => (
          <div key={label} className="card px-5 py-4">
            <div className="text-xs text-mute">{label}</div>
            <div className="mt-1 truncate text-xl font-extrabold">{value}</div>
          </div>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Pipeline" className="min-h-[18rem]">
          <ol className="grid gap-3">
            {(run?.steps || []).map((step) => (
              <li key={step.name} className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 flex-none rounded-full ${stepDot(step.state)}`} />
                <div>
                  <strong className="block text-sm">{step.name}</strong>
                  <em className="text-xs not-italic text-mute">{step.state}</em>
                </div>
              </li>
            ))}
          </ol>
          {!run && <p className="text-sm leading-relaxed text-mute">Press Run pipeline. Jobs appear here as they start: ingestion, AST, embeddings, then the agents.</p>}
        </Panel>

        <Panel title="Dependency graph" className="min-h-[18rem]">
          <div className="min-h-[18rem] flex-1 overflow-hidden rounded-xl border border-line">
            {nodes.length ? (
              <ReactFlow nodes={nodes} edges={edges} onNodeClick={onNodeClick} colorMode="dark" fitView proOptions={{ hideAttribution: true }}>
                <Background color="#24314b" gap={18} />
                <Controls />
              </ReactFlow>
            ) : (
              <p className="p-4 text-sm leading-relaxed text-mute">The graph appears after code analysis. Click a node to read its source.</p>
            )}
          </div>
        </Panel>

        <Panel title="Findings" className="min-h-[18rem]">
          <ul className="grid gap-4">
            {findings.map((item: any) => (
              <li key={`${item.evidence}-${item.title}`} className="border-t border-line pt-3 first:border-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${severityBadge(item.severity)}`}>{item.severity}</span>
                  <span className="text-xs text-mute">{item.status}</span>
                </div>
                <strong className="mt-2 block text-sm">{item.title}</strong>
                <p className="mt-1 text-sm leading-relaxed text-mute">{item.detail}</p>
                <code className="mt-2 block break-words font-mono text-xs text-ember-hot">{item.evidence}</code>
              </li>
            ))}
          </ul>
          {!run && <p className="text-sm leading-relaxed text-mute">Verified findings appear here once the AI analysis job finishes.</p>}
          {run?.status === "completed" && findings.length === 0 && <p className="text-sm text-mute">No findings. Nothing survived verification.</p>}
        </Panel>
      </section>

      <section className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Source inspector">
          <p className="mb-3 truncate font-mono text-xs text-mute">{selected?.label || "Select a graph node"}</p>
          <div className="overflow-hidden rounded-xl border border-line">
            <Editor
              height="300px"
              theme="vs-dark"
              defaultLanguage="javascript"
              value={selected?.code || "// Click a dependency graph node"}
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
            />
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel title="Jobs">
            {jobs.length === 0 && <p className="text-sm text-mute">No jobs yet.</p>}
            <ul className="grid gap-2.5">
              {jobs.map((job: any) => (
                <li key={job.id} className="flex items-center justify-between gap-3 border-t border-line pt-2.5 first:border-0 first:pt-0">
                  <span className="truncate font-mono text-xs">{job.name}</span>
                  <span className="flex items-center gap-3 text-xs">
                    <b className={job.state === "completed" ? "text-quench" : job.state === "failed" ? "text-bad" : "text-ember-hot"}>{job.state}</b>
                    <em className="not-italic text-mute">
                      {job.attemptsMade}/{job.maxAttempts}
                    </em>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Plan">
            {result?.plan?.note ? <p className="text-sm leading-relaxed text-mute">{result.plan.note}</p> : <p className="text-sm text-mute">The plan appears once the run starts.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {(result?.plan?.tasks || []).map((task: string) => (
                <span key={task} className="rounded-full border border-line px-3 py-1 text-xs text-mute">
                  {task}
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Tests and review">
            {!(result?.tests || []).length && !(result?.review || []).length && <p className="text-sm text-mute">Generated tests and review comments appear here.</p>}
            <ul className="grid gap-2.5">
              {(result?.tests || []).map((test: any) => (
                <li key={test.symbol} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-mono text-xs">{test.symbol}</span>
                  <b className={`text-xs ${test.check?.ok ? "text-quench" : "text-bad"}`}>{test.check?.ok ? "passed" : "failed"}</b>
                </li>
              ))}
            </ul>
            <ul className="mt-4 grid gap-4">
              {(result?.review || []).slice(0, 4).map((item: any, i: number) => (
                <li key={i} className="border-t border-line pt-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${severityBadge(item.severity)}`}>{item.severity}</span>
                  <p className="mt-2 text-sm leading-relaxed text-mute">{item.body}</p>
                  <code className="mt-1 block font-mono text-xs text-ember-hot">
                    {item.file}:{item.line}
                  </code>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </section>
    </main>
  );
}
