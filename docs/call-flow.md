# Call flow

1. Browser `Page.launch` → `POST /repositories/import`.
2. API creates a `RunRecord`, saves it, returns `202`, starts `startPipeline`.
3. WebSocket `/ws` and `GET /runs/:id` stream/poll step updates.
4. MemoryBroker (or BullMQ when `REDIS_URL` is set) runs dependent jobs:
   `repo-ingestion` → `code-analysis` → `embedding` → `ai-analysis` → parallel `test-generation` / `pr-review` / `documentation`.
5. Ingest: `readSourceTree` loads `fixtures/payment` (or `FIXTURE_ROOT`).
6. Analysis: Babel AST `parseFiles` + `buildGraph`.
7. Embed: `chunkSymbols` + local/pgvector search.
8. AI: `runAgentGraph` — `planQuestion` → explore/retrieve → LLM suspects (if `GEMINI_API_KEY`) → `verifyFindings` / `staticHunt` → sandboxed tests → review → docs → memory.
9. Dashboard shows React Flow graph, Monaco source, findings, jobs, observability.
