import { Worker } from 'bullmq';
import pino from 'pino';

const logger = pino({ name: 'worker' });

const connection = { url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379' };

/**
 * Phase 0 skeleton: a single no-op queue proving the worker boots and drains.
 * Real processors (invoice-pdf, av-scan, reminders, esign-webhooks) land in
 * their feature phases, one file per queue under src/processors/.
 */
const heartbeat = new Worker(
  'heartbeat',
  async (job) => {
    logger.info({ jobId: job.id }, 'heartbeat processed');
    return { ok: true };
  },
  { connection },
);

heartbeat.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'job failed');
});

logger.info('worker started, listening on queue: heartbeat');
