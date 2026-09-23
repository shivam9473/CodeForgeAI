# CodeForge AI

Autonomous software-engineering desk: import a codebase, run dependent BullMQ/MemoryBroker jobs, explore with AST + RAG, hunt bugs with LLM+static verification, generate sandboxed tests, and review on a live dashboard.

## Quick start

```bash
npm install
cp .env.example .env
# optional: set GEMINI_API_KEY for full LLM agents
npm run dev
```

Open http://localhost:3000 and press **Run pipeline**.

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| WS | ws://localhost:4000/ws |
| Worker health | http://localhost:4008 |

Without Docker, the API uses an in-process **MemoryBroker** (same dependencies, retries, DLQ) and an in-memory store. With Docker:

```bash
docker compose -f infra/docker/docker-compose.yml up -d
# set REDIS_URL and DATABASE_URL in .env
```

```bash
npm run eval
```

## Architecture

Next.js desk → API gateway → agent orchestrator (plan → explore → hunt/verify → tests → review → docs) → queue jobs (ingest → analysis → embed → ai → tests/review/docs) → AST parser, RAG, sandbox.
