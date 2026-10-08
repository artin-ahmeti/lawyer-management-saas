import { Worker } from 'bullmq';
import { jobEnvelopeSchema } from '@lawfirm/core';
import postgres from 'postgres';
import pino from 'pino';
import { randomUUID } from 'node:crypto';
import { workerReadinessKey } from '@lawfirm/db';
import { processingAvailabilityWindowMs, workerHeartbeatSchema } from '@lawfirm/core';
import { workerConfig } from './config.js';
import { ExecutionService } from './execution.js';
import { BullJobQueue, executionQueueName, workerConnection } from './queue.js';
import { pollWithReadiness } from './readiness.js';

const logger = pino({ name: 'worker' });
const config = workerConfig(process.env);
const sql = postgres(config.databaseUrl, {
  max: 8,
  connect_timeout: 5,
  idle_timeout: 20,
  connection: { statement_timeout: 5000, application_name: 'clepso-worker' },
});
const queue = new BullJobQueue(config.redisUrl, logger);
const execution = new ExecutionService(sql, queue, logger);
const worker = new Worker(
  executionQueueName,
  async (job) => {
    const parsed = jobEnvelopeSchema.safeParse(job.data);
    if (!parsed.success || job.id !== parsed.data.jobId || job.name !== 'execute') {
      logger.warn({
        event: 'invalid_queue_envelope',
        entryPoint: 'queue_worker',
        errorCode: 'INVALID_EVENT',
      });
      return;
    }
    await execution.process(parsed.data.jobId);
  },
  { connection: workerConnection(config.redisUrl), concurrency: 5 },
);
worker.on('error', () =>
  logger.warn({
    event: 'queue_consumer_error',
    entryPoint: 'queue_worker',
    errorCode: 'QUEUE_UNAVAILABLE',
  }),
);
worker.on('failed', (job) =>
  logger.warn({
    event: 'queue_attempt_failed',
    entryPoint: 'queue_worker',
    jobId: job?.id,
    errorCode: 'PROCESSING_FAILED',
  }),
);

const instanceId = randomUUID();
const readinessKey = workerReadinessKey(config.databaseUrl);
const backend = worker.getBackend();
let consumerConnection: Awaited<typeof backend.connection.client> | undefined;
let blockingConnection: Awaited<typeof backend.connection.client> | undefined;
void backend.connection.client
  .then((client) => {
    consumerConnection = client;
  })
  .catch(() => undefined);
void backend.blockingConnection?.client
  .then((client) => {
    blockingConnection = client;
  })
  .catch(() => undefined);

let stopping = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let activeTick: Promise<void> | undefined;
const tick = async () => {
  try {
    await pollWithReadiness(
      async () => {
        await execution.recover();
        await execution.dispatchBatch();
      },
      () =>
        !stopping &&
        worker.isRunning() &&
        !worker.isPaused() &&
        consumerConnection?.status === 'ready' &&
        blockingConnection?.status === 'ready' &&
        queue.connection.status === 'ready',
      async () => {
        // Short-lived operational evidence only. It cannot establish delivery or alter durable results.
        // https://redis.io/docs/latest/commands/set/
        const heartbeat = workerHeartbeatSchema.parse({
          instanceId,
          observedAt: new Date().toISOString(),
        });
        await queue.connection.set(
          readinessKey,
          JSON.stringify(heartbeat),
          'PX',
          processingAvailabilityWindowMs,
        );
      },
    );
  } catch {
    logger.error({
      event: 'execution_poll_failed',
      entryPoint: 'outbox_dispatch',
      errorCode: 'PROCESSING_UNAVAILABLE',
    });
  }
};
const poll = () => {
  activeTick = tick().finally(() => {
    if (!stopping) timer = setTimeout(poll, 1000);
  });
};
poll();
logger.info({ event: 'worker_started', entryPoint: 'worker_boot', queue: executionQueueName });

async function shutdown() {
  if (stopping) return;
  stopping = true;
  clearTimeout(timer);
  // A hard deadline leaves unfinished durable leases for another process to recover.
  const deadline = setTimeout(() => {
    logger.error({ event: 'worker_shutdown_timeout', entryPoint: 'worker_shutdown' });
    process.exit(1);
  }, 10000);
  try {
    await activeTick;
    await worker.close();
    await queue.close();
    await sql.end({ timeout: 5 });
    logger.info({ event: 'worker_stopped', entryPoint: 'worker_shutdown' });
  } finally {
    clearTimeout(deadline);
  }
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void shutdown().catch(() => process.exit(1));
  });
