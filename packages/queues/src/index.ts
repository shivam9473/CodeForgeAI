import { Queue, Worker, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { QUEUES, type JobEvent, type JobState, type Priority, type QueueName } from "@codeforge/shared";

export type Handler = (job: {
  id: string;
  name: QueueName;
  data: Record<string, unknown>;
  attemptsMade: number;
}) => Promise<unknown>;

export type EventSink = (event: JobEvent) => void | Promise<void>;

type InternalJob = {
  id: string;
  name: QueueName;
  data: Record<string, unknown>;
  priority: Priority;
  dependsOn: string[];
  attemptsMade: number;
  maxAttempts: number;
  state: JobState;
  error?: string;
  runId: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function rank(p: Priority) {
  return p === "high" ? 3 : p === "medium" ? 2 : 1;
}

/** In-process broker with dependencies, retries, DLQ — used when REDIS_URL is empty. */
export function createMemoryBroker(handlers: Partial<Record<QueueName, Handler>>, onEvent?: EventSink) {
  const jobs = new Map<string, InternalJob>();
  const dead: InternalJob[] = [];
  let ticking = false;

  async function emit(job: InternalJob) {
    if (!onEvent) return;
    await onEvent({
      runId: job.runId,
      jobId: job.id,
      name: job.name,
      state: job.state,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.maxAttempts,
      error: job.error,
      at: new Date().toISOString(),
    });
  }

  async function tick() {
    if (ticking) return;
    ticking = true;
    try {
      let progressed = true;
      while (progressed) {
        progressed = false;
        const waiting = [...jobs.values()]
          .filter((j) => j.state === "waiting")
          .filter((j) => j.dependsOn.every((id) => jobs.get(id)?.state === "completed"))
          .sort((a, b) => rank(b.priority) - rank(a.priority));

        for (const job of waiting) {
          progressed = true;
          job.state = "active";
          job.attemptsMade += 1;
          await emit(job);
          const handler = handlers[job.name];
          try {
            if (!handler) throw new Error(`No handler for ${job.name}`);
            await handler(job);
            job.state = "completed";
            await emit(job);
          } catch (error) {
            job.error = error instanceof Error ? error.message : String(error);
            if (job.attemptsMade < job.maxAttempts) {
              job.state = "delayed";
              await emit(job);
              await sleep(200 * 2 ** (job.attemptsMade - 1));
              job.state = "waiting";
              await emit(job);
            } else {
              job.state = "failed";
              dead.push({ ...job });
              await emit(job);
            }
          }
        }
      }
    } finally {
      ticking = false;
    }
  }

  return {
    mode: "memory" as const,
    add(
      name: QueueName,
      data: Record<string, unknown>,
      opts: { id: string; runId: string; dependsOn?: string[]; priority?: Priority; attempts?: number }
    ) {
      const job: InternalJob = {
        id: opts.id,
        name,
        data,
        priority: opts.priority || "low",
        dependsOn: opts.dependsOn || [],
        attemptsMade: 0,
        maxAttempts: opts.attempts || 3,
        state: "waiting",
        runId: opts.runId,
      };
      jobs.set(job.id, job);
      void emit(job).then(() => tick());
      return job;
    },
    async waitFor(ids: string[]) {
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          const done = ids.every((id) => {
            const job = jobs.get(id);
            return job && (job.state === "completed" || job.state === "failed");
          });
          if (done) {
            clearInterval(timer);
            resolve();
          }
        }, 40);
      });
    },
    snapshot() {
      return {
        jobs: [...jobs.values()],
        dead: dead.map((j) => ({ id: j.id, name: j.name, error: j.error })),
      };
    },
  };
}

export type MemoryBroker = ReturnType<typeof createMemoryBroker>;

export function createRedisConnection() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function createBullQueues(connection: ConnectionOptions) {
  const opts = { connection };
  return Object.fromEntries(
    Object.values(QUEUES).map((name) => [name, new Queue(name, opts)])
  ) as Record<QueueName, Queue>;
}

export function attachBullWorkers(
  connection: ConnectionOptions,
  handlers: Partial<Record<QueueName, Handler>>,
  onEvent?: EventSink
) {
  const workers: Worker[] = [];
  for (const name of Object.values(QUEUES)) {
    const handler = handlers[name];
    if (!handler) continue;
    workers.push(
      new Worker(
        name,
        async (job) => {
          const runId = String(job.data.runId || "");
          await onEvent?.({
            runId,
            jobId: String(job.id),
            name,
            state: "active",
            attemptsMade: job.attemptsMade + 1,
            maxAttempts: job.opts.attempts || 3,
            at: new Date().toISOString(),
          });
          try {
            const result = await handler({
              id: String(job.id),
              name,
              data: job.data as Record<string, unknown>,
              attemptsMade: job.attemptsMade + 1,
            });
            await onEvent?.({
              runId,
              jobId: String(job.id),
              name,
              state: "completed",
              attemptsMade: job.attemptsMade + 1,
              maxAttempts: job.opts.attempts || 3,
              at: new Date().toISOString(),
            });
            return result;
          } catch (error) {
            await onEvent?.({
              runId,
              jobId: String(job.id),
              name,
              state: "failed",
              attemptsMade: job.attemptsMade + 1,
              maxAttempts: job.opts.attempts || 3,
              error: error instanceof Error ? error.message : String(error),
              at: new Date().toISOString(),
            });
            throw error;
          }
        },
        { connection }
      )
    );
  }
  return workers;
}

export { QUEUES };
