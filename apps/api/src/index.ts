import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { getStore } from "@codeforge/database";
import { defaultRoot, startPipeline } from "@codeforge/orchestrator";
import { QUEUES, type JobEvent, type RunRecord } from "@codeforge/shared";

const port = Number(process.env.API_PORT || 4000);
const sockets = new Set<WebSocket>();

function broadcast(payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(raw);
  }
}

function send(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.WEB_ORIGIN || "http://localhost:3000",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw) as { question?: string; root?: string; url?: string };
}

function createRun(id: string, question: string, root: string): RunRecord {
  return {
    id,
    question,
    status: "running",
    root,
    steps: Object.values(QUEUES).map((name) => ({ name, state: "waiting" as const })),
    result: null,
    createdAt: new Date().toISOString(),
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") return send(res, 204, {});
    const url = new URL(req.url || "/", `http://localhost:${port}`);

    if (req.method === "GET" && url.pathname === "/health") {
      const store = await getStore();
      return send(res, 200, {
        status: "ok",
        service: "codeforge-api",
        store: store.mode,
        gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
        redis: Boolean(process.env.REDIS_URL?.trim()),
      });
    }

    if (req.method === "POST" && url.pathname === "/repositories/import") {
      let body: { question?: string; root?: string; url?: string };
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { error: "Invalid JSON body" });
      }
      const store = await getStore();
      const id = `run_${Date.now().toString(36)}`;
      const root = body.root?.trim() || defaultRoot();
      const run = createRun(id, body.question || "Find security vulnerabilities and generate tests", root);
      await store.saveRun(run);
      void startPipeline(run, (event) => {
        if ("type" in event && event.type === "run") broadcast({ type: "run", run: event.run });
        else broadcast({ type: "job", event: event as JobEvent });
      }).catch(async (error) => {
        run.status = "failed";
        run.result = {
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
          queue: { jobs: [], dead: [{ error: error.message }] },
        };
        await store.saveRun(run);
        broadcast({ type: "run", run });
      });
      return send(res, 202, { id, status: run.status });
    }

    const match = url.pathname.match(/^\/runs\/([^/]+)$/);
    if (req.method === "GET" && match) {
      const store = await getStore();
      const run = await store.getRun(match[1]);
      if (!run) return send(res, 404, { error: "Run not found" });
      return send(res, 200, run);
    }

    if (req.method === "GET" && url.pathname === "/runs") {
      const store = await getStore();
      return send(res, 200, await store.listRuns());
    }

    send(res, 404, { error: "Not found" });
  } catch (error) {
    if (!res.headersSent) {
      send(res, 500, { error: error instanceof Error ? error.message : "Server error" });
    }
  }
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
  sockets.add(ws);
  ws.send(JSON.stringify({ type: "hello", service: "codeforge-api" }));
  ws.on("close", () => sockets.delete(ws));
});

server.listen(port, () => {
  console.log(`CodeForge API on :${port} (ws /ws)`);
});
