import { Queue, type ConnectionOptions } from 'bullmq';
import { Redis } from 'ioredis';
import type { Logger } from 'pino';
import type { JobQueue } from './execution.js';

export const executionQueueName = 'clepso-execution-v1';
export const workerConnection = (url: string): ConnectionOptions => ({
  url,
  maxRetriesPerRequest: null,
  connectTimeout: 2000,
});

export class BullJobQueue implements JobQueue {
  readonly connection: Redis;
  private queue: Queue | null = null;
  constructor(
    url: string,
    private readonly logger: Logger,
    private readonly name = executionQueueName,
  ) {
    // Producer fails fast; the independent blocking consumer reconnects indefinitely.
    // https://docs.bullmq.io/guide/connections
    this.connection = new Redis(url, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      commandTimeout: 2000,
      connectTimeout: 2000,
    });
    this.connection.on('error', () =>
      this.logger.warn({
        event: 'queue_connection_error',
        entryPoint: 'outbox_dispatch',
        errorCode: 'QUEUE_UNAVAILABLE',
      }),
    );
  }
  async enqueue(jobId: string) {
    if (this.connection.status !== 'ready') throw new Error('QUEUE_UNAVAILABLE');
    if (!this.queue) {
      this.queue = new Queue(this.name, { connection: this.connection });
      this.queue.on('error', () =>
        this.logger.warn({
          event: 'queue_error',
          entryPoint: 'outbox_dispatch',
          errorCode: 'QUEUE_UNAVAILABLE',
        }),
      );
    }
    const queue = this.queue;
    try {
      // Queue IDs limit transport duplicates, not business effects. Postgres survives auto-removal and Redis loss.
      // https://docs.bullmq.io/guide/jobs/job-ids
      await queue.add(
        'execute',
        { jobId },
        { jobId, attempts: 1, removeOnComplete: true, removeOnFail: true },
      );
    } catch (error) {
      if (this.queue === queue) this.queue = null;
      await queue.close().catch(() => undefined);
      throw error;
    }
  }
  async close() {
    try {
      await this.queue?.close();
    } finally {
      this.connection.disconnect();
    }
  }
}
