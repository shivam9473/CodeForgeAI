"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
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

export default function Page() {
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
      const res = await fetch(`${API}/runs/${run.id}`);
      if (res.ok) setRun(await res.json());
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
      setError(err instanceof Error ? err.message : "Failed");
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
        background: "#1b2116",
        color: "#eef2e6",
        border: "1px solid #31392a",
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
      style: { stroke: "#e08a45" },
    }));
  }, [result?.graph?.edges]);

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      const symbol = (result?.symbols || []).find((s: any) => `${s.file}:${s.name}` === node.id);
      setSelected({
        id: node.id,
        label: node.id,
        code: symbol?.body || `// No body for ${node.id}`,
      });
    },
    [result?.symbols]
  );

  return (
    <main>
      <header className="top">
        <div>
          <p className="mark">CodeForge</p>
          <h1>Autonomous review desk</h1>
        </div>
        <div className="row">
          <div className="pill">ws {wsState}</div>
          <div className="pill">{run ? run.status : "idle"}</div>
          <div className="pill">{result?.aiMode || "—"}</div>
        </div>
      </header>

      <section className="ask">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
        <div className="row">
          {PRESETS.map((text) => (
            <button key={text} className="ghost" onClick={() => setQuestion(text)} type="button">
              {text.slice(0, 42)}
            </button>
          ))}
          <button className="go" onClick={launch} disabled={busy} type="button">
            {busy ? "Queuing" : "Run pipeline"}
          </button>
        </div>
        {error && <p className="err">{error}</p>}
      </section>

      <section className="panel" style={{ marginBottom: 14, minHeight: 0 }}>
        <h2>Observability</h2>
        <div className="obs">
          <span>
            latency <b>{obs?.latencyMs ?? 0}ms</b>
          </span>
          <span>
            tokens <b>{(obs?.tokensIn ?? 0) + (obs?.tokensOut ?? 0)}</b>
          </span>
          <span>
            model <b>{obs?.model ?? "none"}</b>
          </span>
          <span>
            cost <b>${obs?.costUsd ?? 0}</b>
          </span>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Pipeline</h2>
          <ol className="steps">
            {(run?.steps || []).map((step) => (
              <li key={step.name}>
                <span className={`dot ${step.state}`} />
                <div>
                  <strong>{step.name}</strong>
                  <em>{step.state}</em>
                </div>
              </li>
            ))}
            {!run && <p className="muted">Import starts ingestion → AST → embeddings → agents.</p>}
          </ol>
        </article>

        <article className="panel">
          <h2>Dependency graph</h2>
          <div className="graph-wrap">
            {nodes.length ? (
              <ReactFlow nodes={nodes} edges={edges} onNodeClick={onNodeClick} fitView>
                <Background color="#31392a" gap={18} />
                <MiniMap pannable zoomable />
                <Controls />
              </ReactFlow>
            ) : (
              <p className="muted">Graph appears after code analysis. Click a node for source.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <h2>Findings</h2>
          <ul className="findings">
            {findings.map((item: any) => (
              <li key={`${item.evidence}-${item.title}`}>
                <span className={item.severity}>{item.severity}</span>{" "}
                <span className="muted">{item.status}</span>
                <strong style={{ display: "block" }}>{item.title}</strong>
                <p className="muted">{item.detail}</p>
                <code>{item.evidence}</code>
              </li>
            ))}
            {run?.status === "completed" && findings.length === 0 && <p className="muted">No findings.</p>}
          </ul>
        </article>
      </section>

      <section className="detail">
        <article className="panel">
          <h2>Source inspector</h2>
          <p className="muted">{selected?.label || "Select a graph node"}</p>
          <div className="editor">
            <Editor
              height="280px"
              theme="vs-dark"
              defaultLanguage="javascript"
              value={selected?.code || "// Click a dependency graph node"}
              options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
            />
          </div>
        </article>

        <div style={{ display: "grid", gap: 14 }}>
          <article className="panel" style={{ minHeight: 0 }}>
            <h2>Jobs</h2>
            <ul className="jobs">
              {jobs.map((job: any) => (
                <li key={job.id}>
                  <span>{job.name}</span>
                  <b>{job.state}</b>
                  <em className="muted">
                    {job.attemptsMade}/{job.maxAttempts}
                  </em>
                </li>
              ))}
            </ul>
          </article>
          <article className="panel" style={{ minHeight: 0 }}>
            <h2>Plan</h2>
            <p className="muted">{result?.plan?.note}</p>
            <div className="chips">
              {(result?.plan?.tasks || []).map((task: string) => (
                <span key={task}>{task}</span>
              ))}
            </div>
          </article>
          <article className="panel" style={{ minHeight: 0 }}>
            <h2>Tests / Review</h2>
            <ul className="jobs">
              {(result?.tests || []).map((test: any) => (
                <li key={test.symbol}>
                  <span>{test.symbol}</span>
                  <b>{test.check?.ok ? "passed" : "failed"}</b>
                </li>
              ))}
            </ul>
            <ul className="findings" style={{ marginTop: 12 }}>
              {(result?.review || []).slice(0, 4).map((item: any, i: number) => (
                <li key={i}>
                  <span className={item.severity}>{item.severity}</span>
                  <p className="muted">{item.body}</p>
                  <code>
                    {item.file}:{item.line}
                  </code>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
