# `services/agent-orchestrator`

`startPipeline(run, broadcast)` wires MemoryBroker handlers for every CodeForge queue.

- **INGEST** — `readSourceTree(run.root)`
- **ANALYSIS** — `parseFiles` + `buildGraph`
- **EMBED** — `chunkSymbols`, `searchLocal`, `store.replaceChunks`
- **AI** — `runAgentGraph` (planner, hunter, verifier, tests, review, docs, memory)
- **TESTS / REVIEW / DOCS** — ensure board jobs complete; payload already filled by the agent graph

`waitFor` blocks until docs/tests/review finish, then `run.finish` equivalent via `store.saveRun`.
