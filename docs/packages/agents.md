# `packages/agents`

`runAgentGraph` is the LangGraph-style state machine:

1. `planQuestion` — Gemini JSON tasks when `GEMINI_API_KEY` is set, else heuristic planner.
2. `explore` — file roles (http/domain/data).
3. `llmSuspects` — Gemini proposes bugs (optional).
4. `verifyFindings` + `staticHunt` — only confirmed findings ship.
5. `generateTestsFor` — Gemini or template tests → `checkSyntax` / `runTests` sandbox with one retry.
6. `reviewFindings` + `writeDocs` + memory strings.

Exports also used by `evals/score.ts`: `staticHunt`.
