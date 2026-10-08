import { randomUUID } from 'node:crypto';
import { Worker } from 'bullmq';
import pino from 'pino';
import { expect, it } from 'vitest';
import { BullJobQueue, workerConnection } from '../src/queue.js';
import { ExecutionService } from '../src/execution.js';
import { executionDatabase } from './database.js';
import { jobEnvelopeSchema } from '@lawfirm/core';

it('dispatches a real Redis envelope and preserves terminal results across queue removal and replay', async () => {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6389';
  if (!['localhost', '127.0.0.1'].includes(new URL(redisUrl).hostname))
    throw new Error('Local Redis required');
  const database = executionDatabase();
  const logger = pino({ level: 'silent' });
  const queueName = `clepso-test-${randomUUID()}`;
  const queue = new BullJobQueue(redisUrl, logger, queueName);
  const service = new ExecutionService(database.sql, queue, logger);
  const received: unknown[] = [];
  const worker = new Worker(
    queueName,
    async (job) => {
      received.push(job.data);
      const envelope = jobEnvelopeSchema.parse(job.data);
      await service.process(envelope.jobId);
    },
    { connection: workerConnection(redisUrl) },
  );
  worker.on('error', () => undefined);
  try {
    await database.start();
    if (queue.connection.status !== 'ready')
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Local Redis unavailable')), 5000);
        queue.connection.once('ready', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    const sql = database.sql;
    const firm = randomUUID(),
      actor = randomUUID(),
      event = randomUUID();
    await sql`insert into auth.users (id, email, raw_user_meta_data) values (${actor}, ${`${actor}@redis.test`}, '{}'::jsonb)`;
    await sql`insert into firms (id, name, revision) values (${firm}, 'Queue LLP', 1)`;
    await sql`insert into firm_members (firm_id, user_id, role) values (${firm}, ${actor}, 'owner')`;
    await sql`insert into outbox_events (id, firm_id, created_by, command_id, request_id, event_type, payload)
      values (${event}, ${firm}, ${actor}, ${randomUUID()}, ${randomUUID()}, 'firm.renamed.v1', ${sql.json({ firmId: firm, revision: 1 })})`;
    await service.dispatchBatch();
    await expect
      .poll(
        async () => (await sql`select status from job_executions where id = ${event}`)[0]?.status,
      )
      .toBe('succeeded');
    expect(received).toEqual([{ jobId: event }]);
    // Wait for BullMQ auto-removal so queue deduplication cannot mask the durable replay gate.
    await expect.poll(() => queue.connection.exists(`bull:${queueName}:${event}`)).toBe(0);
    await queue.enqueue(event);
    await expect.poll(() => received.length).toBe(2);
    await expect.poll(() => queue.connection.exists(`bull:${queueName}:${event}`)).toBe(0);
    const [job] = await sql`select attempts, result from job_executions where id = ${event}`;
    expect(job).toEqual({ attempts: 1, result: { kind: 'firm_profile_verified', revision: 1 } });
  } finally {
    await worker.close(true);
    for (const key of await queue.connection.keys(`bull:${queueName}:*`))
      await queue.connection.del(key);
    await queue.close();
    await database.close();
  }
}, 20000);

it('a disconnected producer rejects promptly instead of waiting for a future Redis recovery', async () => {
  const queue = new BullJobQueue(
    'redis://127.0.0.1:1',
    pino({ level: 'silent' }),
    `clepso-test-${randomUUID()}`,
  );
  const started = performance.now();
  try {
    await expect(queue.enqueue(randomUUID())).rejects.toThrow('QUEUE_UNAVAILABLE');
    expect(performance.now() - started).toBeLessThan(1000);
  } finally {
    await queue.close();
  }
});
