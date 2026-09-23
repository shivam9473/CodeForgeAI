import http from "node:http";
import { createRedisConnection, attachBullWorkers, QUEUES } from "@codeforge/queues";

const port = Number(process.env.WORKER_PORT || 4008);
const redis = createRedisConnection();

http
  .createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "codeforge-workers",
        redis: Boolean(redis),
        mode: redis ? "bullmq" : "memory-broker-in-api",
        queues: Object.values(QUEUES),
      })
    );
  })
  .listen(port, () => {
    console.log(`CodeForge workers health on :${port}`);
  });

if (!redis) {
  console.log("REDIS_URL empty — pipeline runs via MemoryBroker inside the API process.");
} else {
  attachBullWorkers(redis, {
    // Bull path: jobs are acknowledged; heavy work still orchestrated from API for local single-box demos.
    [QUEUES.INGEST]: async (job) => ({ ok: true, id: job.id }),
    [QUEUES.ANALYSIS]: async (job) => ({ ok: true, id: job.id }),
    [QUEUES.EMBED]: async (job) => ({ ok: true, id: job.id }),
    [QUEUES.AI]: async (job) => ({ ok: true, id: job.id }),
    [QUEUES.TESTS]: async (job) => ({ ok: true, id: job.id }),
    [QUEUES.REVIEW]: async (job) => ({ ok: true, id: job.id }),
    [QUEUES.DOCS]: async (job) => ({ ok: true, id: job.id }),
  });
  console.log("BullMQ workers attached for all CodeForge queues");
}
