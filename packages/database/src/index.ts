import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { Finding, JobEvent, RunRecord, RunResult } from "@codeforge/shared";

type ChunkRow = {
  id: string;
  repositoryId: string;
  file: string;
  symbol: string;
  content: string;
  embedding: number[];
};

type MemoryRow = { id: string; kind: string; repositoryId?: string; content: string };

export interface Store {
  mode: "memory" | "postgres";
  upsertRepository(id: string, fullName: string, rootPath: string): Promise<void>;
  saveRun(run: RunRecord): Promise<void>;
  getRun(id: string): Promise<RunRecord | null>;
  listRuns(): Promise<RunRecord[]>;
  replaceChunks(repositoryId: string, chunks: ChunkRow[]): Promise<void>;
  searchChunks(repositoryId: string, embedding: number[], limit?: number): Promise<{ id: string; score: number; file: string; symbol: string; content: string }[]>;
  saveFindings(runId: string, findings: Finding[]): Promise<void>;
  saveMemory(kind: string, content: string, repositoryId?: string): Promise<void>;
  listMemory(kind?: string, repositoryId?: string): Promise<MemoryRow[]>;
  addJobEvent(event: JobEvent): Promise<void>;
  listJobEvents(runId: string): Promise<JobEvent[]>;
}

function cosine(a: number[], b: number[]) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] || 0) * (b[i] || 0);
  return Number(dot.toFixed(4));
}

function createMemoryStore(): Store {
  const runs = new Map<string, RunRecord>();
  const chunks = new Map<string, ChunkRow[]>();
  const memories: MemoryRow[] = [];
  const events: JobEvent[] = [];

  return {
    mode: "memory",
    async upsertRepository() {},
    async saveRun(run) {
      runs.set(run.id, structuredClone(run));
    },
    async getRun(id) {
      const run = runs.get(id);
      return run ? structuredClone(run) : null;
    },
    async listRuns() {
      return [...runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async replaceChunks(repositoryId, rows) {
      chunks.set(repositoryId, rows);
    },
    async searchChunks(repositoryId, embedding, limit = 4) {
      const rows = chunks.get(repositoryId) || [];
      return rows
        .map((row) => ({
          id: row.id,
          score: cosine(embedding, row.embedding),
          file: row.file,
          symbol: row.symbol,
          content: row.content,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    async saveFindings() {},
    async saveMemory(kind, content, repositoryId) {
      memories.push({ id: `mem_${Date.now()}`, kind, repositoryId, content });
    },
    async listMemory(kind, repositoryId) {
      return memories.filter((m) => (!kind || m.kind === kind) && (!repositoryId || m.repositoryId === repositoryId));
    },
    async addJobEvent(event) {
      events.push(event);
    },
    async listJobEvents(runId) {
      return events.filter((e) => e.runId === runId);
    },
  };
}

async function createPostgresStore(connectionString: string): Promise<Store> {
  const pool = new pg.Pool({ connectionString });
  const schema = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../schema.sql"),
    "utf8"
  );
  await pool.query(schema);

  return {
    mode: "postgres",
    async upsertRepository(id, fullName, rootPath) {
      await pool.query(
        `INSERT INTO repositories (id, full_name, root_path) VALUES ($1,$2,$3)
         ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, root_path = EXCLUDED.root_path`,
        [id, fullName, rootPath]
      );
    },
    async saveRun(run) {
      await pool.query(
        `INSERT INTO runs (id, question, status, result_json) VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, result_json = EXCLUDED.result_json`,
        [run.id, run.question, run.status, run.result]
      );
    },
    async getRun(id) {
      const res = await pool.query(`SELECT * FROM runs WHERE id = $1`, [id]);
      const row = res.rows[0];
      if (!row) return null;
      return {
        id: row.id,
        question: row.question,
        status: row.status,
        root: "",
        steps: [],
        result: row.result_json as RunResult | null,
        createdAt: row.created_at.toISOString(),
      };
    },
    async listRuns() {
      const res = await pool.query(`SELECT * FROM runs ORDER BY created_at DESC LIMIT 50`);
      return res.rows.map((row) => ({
        id: row.id,
        question: row.question,
        status: row.status,
        root: "",
        steps: [],
        result: row.result_json,
        createdAt: row.created_at.toISOString(),
      }));
    },
    async replaceChunks(repositoryId, rows) {
      await pool.query(`DELETE FROM chunks WHERE repository_id = $1`, [repositoryId]);
      for (const row of rows) {
        await pool.query(
          `INSERT INTO chunks (id, repository_id, file_path, symbol, content, embedding)
           VALUES ($1,$2,$3,$4,$5,$6::vector)`,
          [row.id, repositoryId, row.file, row.symbol, row.content, `[${row.embedding.join(",")}]`]
        );
      }
    },
    async searchChunks(repositoryId, embedding, limit = 4) {
      const res = await pool.query(
        `SELECT id, file_path, symbol, content, 1 - (embedding <=> $2::vector) AS score
         FROM chunks WHERE repository_id = $1
         ORDER BY embedding <=> $2::vector ASC LIMIT $3`,
        [repositoryId, `[${embedding.join(",")}]`, limit]
      );
      return res.rows.map((row) => ({
        id: row.id,
        score: Number(row.score),
        file: row.file_path,
        symbol: row.symbol,
        content: row.content,
      }));
    },
    async saveFindings(runId, findings) {
      for (const f of findings) {
        await pool.query(
          `INSERT INTO findings (id, run_id, severity, title, detail, file_path, line, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [`${runId}_${f.evidence}_${f.title}`.slice(0, 120), runId, f.severity, f.title, f.detail, f.file, f.line, f.status]
        );
      }
    },
    async saveMemory(kind, content, repositoryId) {
      await pool.query(`INSERT INTO memories (id, kind, repository_id, content) VALUES ($1,$2,$3,$4)`, [
        `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        kind,
        repositoryId || null,
        content,
      ]);
    },
    async listMemory(kind, repositoryId) {
      const res = await pool.query(
        `SELECT * FROM memories WHERE ($1::text IS NULL OR kind = $1) AND ($2::text IS NULL OR repository_id = $2)
         ORDER BY created_at DESC LIMIT 20`,
        [kind || null, repositoryId || null]
      );
      return res.rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        repositoryId: row.repository_id,
        content: row.content,
      }));
    },
    async addJobEvent(event) {
      await pool.query(
        `INSERT INTO job_events (run_id, job_id, name, state, attempts_made, payload)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [event.runId, event.jobId, event.name, event.state, event.attemptsMade, event]
      );
    },
    async listJobEvents(runId) {
      const res = await pool.query(
        `SELECT payload FROM job_events WHERE run_id = $1 ORDER BY id ASC`,
        [runId]
      );
      return res.rows.map((row) => row.payload as JobEvent);
    },
  };
}

let storePromise: Promise<Store> | null = null;

export function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = (async () => {
      const url = process.env.DATABASE_URL?.trim();
      if (url) {
        try {
          return await createPostgresStore(url);
        } catch (error) {
          console.warn("Postgres unavailable, using memory store:", (error as Error).message);
        }
      }
      return createMemoryStore();
    })();
  }
  return storePromise;
}

export async function migrate() {
  const store = await getStore();
  console.log(`database mode=${store.mode}`);
}
