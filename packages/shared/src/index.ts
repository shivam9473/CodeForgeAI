export const QUEUES = {
  INGEST: "repo-ingestion",
  ANALYSIS: "code-analysis",
  EMBED: "embedding",
  AI: "ai-analysis",
  TESTS: "test-generation",
  REVIEW: "pr-review",
  DOCS: "documentation",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export type JobState =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "queued";

export type Priority = "high" | "medium" | "low";

export interface SymbolInfo {
  file: string;
  name: string;
  params: string[];
  line: number;
  body: string;
  endLine: number;
}

export interface SourceFile {
  path: string;
  content: string;
}

export interface GraphNode {
  id: string;
  name: string;
  file: string;
  line: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  call: string;
}

export interface Finding {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  file: string;
  line: number;
  symbol: string;
  evidence: string;
  status: "suspected" | "confirmed" | "rejected";
  source: "llm" | "static" | "verified";
}

export interface AgentPlan {
  question: string;
  tasks: string[];
  note: string;
  model?: string;
}

export interface Observability {
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  model: string;
  costUsd: number;
  steps: { name: string; latencyMs: number; tokens?: number }[];
}

export interface RunResult {
  files: SourceFile[];
  symbols: SymbolInfo[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  chunks: { id: string; file: string; symbol: string; content: string }[];
  hits: { id: string; score: number; file: string; symbol: string }[];
  plan: AgentPlan | null;
  map: { file: string; role: string; symbols: string[] }[];
  findings: Finding[];
  tests: { symbol: string; file: string; source: string; check?: { ok: boolean; stderr?: string } }[];
  review: { severity: string; file: string; line: number; body: string }[];
  docs: string;
  memory: { repository: string; task: string };
  observability: Observability;
  aiMode: "gemini" | "tools-only";
  queue?: { jobs: unknown[]; dead: unknown[] };
}

export interface JobEvent {
  runId: string;
  jobId: string;
  name: string;
  state: JobState;
  attemptsMade: number;
  maxAttempts: number;
  error?: string;
  progress?: number;
  at: string;
}

export interface RunRecord {
  id: string;
  question: string;
  status: "running" | "completed" | "failed";
  root: string;
  steps: { name: string; state: JobState }[];
  result: RunResult | null;
  createdAt: string;
}
