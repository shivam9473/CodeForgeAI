# `apps/api`

HTTP + WebSocket gateway.

- `GET /health` — store mode, gemini/redis flags
- `POST /repositories/import` — 202 + pipeline
- `GET /runs/:id` — poll
- `WS /ws` — job and run events

CORS allows `WEB_ORIGIN` (default `http://localhost:3000`).
