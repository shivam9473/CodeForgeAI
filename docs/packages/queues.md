# `packages/queues`

- `createMemoryBroker` — default local path: dependencies, priority, exponential backoff, DLQ, event sink.
- `createRedisConnection` / `createBullQueues` / `attachBullWorkers` — used when `REDIS_URL` is set.

Queue names live in `@codeforge/shared` `QUEUES`.
