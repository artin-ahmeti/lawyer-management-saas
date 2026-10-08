import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { executionDatabase } from './database.js';
import pino from 'pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ExecutionService } from '../src/execution.js';

const database = executionDatabase();
const sql = database.sql;
const firmId = randomUUID();
const actorId = randomUUID();
const queued: string[] = [];
const logger = pino({ level: 'silent' });
const queue = {
  enqueue: async (jobId: string) => {
    queued.push(jobId);
  },
};
const service = new ExecutionService(sql, queue, logger);
let eventId: string;

async function insertEvent(
  eventType = 'firm.renamed.v1',
  payload: unknown = { firmId, revision: 1 },
) {
  const id = randomUUID();
  await sql`insert into outbox_events (id, firm_id, created_by, command_id, request_id, event_type, payload)
    values (${id}, ${firmId}, ${actorId}, ${randomUUID()}, ${randomUUID()}, ${eventType}, ${sql.json(payload as postgres.JSONValue)})`;
  return id;
}
async function job(id = eventId) {
  const [row] = await sql`select * from job_executions where id = ${id}`;
  return row;
}
async function history(id = eventId) {
  return sql`select attempt_number, status, error_code, started_at, finished_at
    from job_execution_attempts where job_id = ${id} order by attempt_number`;
}
beforeAll(async () => {
  await database.start();
  await sql`insert into auth.users (id, email, raw_user_meta_data) values (${actorId}, ${`${actorId}@jobs.test`}, '{}'::jsonb)`;
  await sql`insert into firms (id, name, revision) values (${firmId}, 'Execution LLP', 1)`;
  await sql`insert into firm_members (firm_id, user_id, role) values (${firmId}, ${actorId}, 'owner')`;
});
beforeEach(async () => {
  queued.length = 0;
  const [exists] = await sql`select to_regclass('public.job_execution_attempts') as name`;
  if (exists?.name) await sql`delete from job_execution_attempts where firm_id = ${firmId}`;
  await sql`delete from job_executions where firm_id = ${firmId}`;
  await sql`delete from outbox_events where firm_id = ${firmId}`;
  await sql`update firm_members set role = 'owner', deleted_at = null where firm_id = ${firmId}`;
  await sql`update firms set deleted_at = null, revision = 1 where id = ${firmId}`;
  eventId = await insertEvent();
});
afterAll(async () => {
  const [exists] = await sql`select to_regclass('public.job_execution_attempts') as name`;
  if (exists?.name) await sql`delete from job_execution_attempts where firm_id = ${firmId}`;
  await sql`delete from job_executions where firm_id = ${firmId}`;
  await sql`delete from outbox_events where firm_id = ${firmId}`;
  await sql`delete from firm_members where firm_id = ${firmId}`;
  await sql`delete from firms where id = ${firmId}`;
  await sql`delete from auth.users where id = ${actorId}`;
  await database.close();
});

describe('durable execution', () => {
  it('runs an explicitly reviewed profile check and still blocks revoked authority', async () => {
    const replacement = await insertEvent('firm.profile-check-requested.v1');
    await service.dispatchBatch();
    await service.process(replacement);
    expect(await job(replacement)).toMatchObject({
      status: 'succeeded',
      attempts: 1,
      result: { kind: 'firm_profile_verified', revision: 1 },
    });
    const revoked = await insertEvent('firm.profile-check-requested.v1');
    await service.dispatchBatch();
    await sql`update firm_members set deleted_at = now() where firm_id = ${firmId}`;
    await service.process(revoked);
    expect(await job(revoked)).toMatchObject({
      status: 'blocked',
      last_error_code: 'ACCESS_REVOKED',
    });
  });
  it('recovers a committed event; concurrent dispatch and duplicate processing produce one durable result', async () => {
    await Promise.all([service.dispatchBatch(), service.dispatchBatch()]);
    expect(queued.filter((id) => id === eventId)).toHaveLength(1);
    const [event] = await sql`select dispatched_at from outbox_events where id = ${eventId}`;
    expect(event?.dispatched_at).not.toBeNull();
    await Promise.all([service.process(eventId), service.process(eventId)]);
    expect(await job()).toMatchObject({
      status: 'succeeded',
      attempts: 1,
      result: { kind: 'firm_profile_verified', revision: 1 },
    });
    await service.process(eventId);
    expect((await job())?.attempts).toBe(1);
    expect(await history()).toEqual([
      {
        attempt_number: 1,
        status: 'succeeded',
        error_code: null,
        started_at: expect.any(Date),
        finished_at: expect.any(Date),
      },
    ]);
    const [firm] = await sql`select revision from firms where id = ${firmId}`;
    expect(firm?.revision).toBe(1);
  });

  it('queue failure keeps pending work and bounded backoff; a later dispatch recovers it', async () => {
    const broken = new ExecutionService(
      sql,
      {
        enqueue: async () => {
          throw new Error('private queue credentials');
        },
      },
      logger,
    );
    await broken.dispatchBatch();
    const [pending] =
      await sql`select dispatched_at, last_error_code, available_at > now() as delayed from outbox_events where id = ${eventId}`;
    expect(pending).toEqual({
      dispatched_at: null,
      last_error_code: 'QUEUE_UNAVAILABLE',
      delayed: true,
    });
    expect((await job())?.status).toBe('pending');
    await sql`update outbox_events set available_at = now() where id = ${eventId}`;
    await service.dispatchBatch();
    await service.process(eventId);
    expect((await job())?.status).toBe('succeeded');
  });

  it('recovers enqueue-before-ack crash and loses no work after Redis state loss', async () => {
    const [claimed] = await service.claimDispatch();
    expect(claimed?.id).toBe(eventId);
    await queue.enqueue(eventId); // simulate accepted queue job, then process exit before database ack
    await sql`update outbox_events set dispatch_lease_until = now() - interval '1 second' where id = ${eventId}`;
    await service.dispatchBatch();
    expect(queued.filter((id) => id === eventId)).toHaveLength(2);
    await sql`update outbox_events set dispatched_at = now() - interval '1 minute' where id = ${eventId}`;
    await service.recover();
    await service.dispatchBatch();
    expect(queued.filter((id) => id === eventId)).toHaveLength(3);
    await service.process(eventId);
    expect((await job())?.attempts).toBe(1);
  });

  it('fences an expired executor and recovers its lease without duplicating completion', async () => {
    await service.dispatchBatch();
    const first = await service.claimExecution(eventId);
    expect(first).not.toBeNull();
    await sql`update job_executions set lease_until = now() - interval '1 second' where id = ${eventId}`;
    const next = await service.claimExecution(eventId);
    expect(next?.lease_token).not.toBe(first?.lease_token);
    if (!first || !next) throw new Error('Expected two fenced leases');
    await service.executeClaim(first);
    expect((await job())?.status).toBe('running');
    await service.executeClaim(next);
    expect(await job()).toMatchObject({ status: 'succeeded', attempts: 2 });
    const attempts = await history();
    expect(attempts).toMatchObject([
      {
        attempt_number: 1,
        status: 'interrupted',
        error_code: 'LEASE_EXPIRED',
        finished_at: expect.any(Date),
      },
      { attempt_number: 2, status: 'succeeded', error_code: null, finished_at: expect.any(Date) },
    ]);
    await service.failExecution(first);
    expect(await history()).toEqual(attempts);
  });

  it.each(['revoked', 'downgraded', 'deleted firm', 'changed revision'] as const)(
    'blocks %s before execution',
    async (condition) => {
      await service.dispatchBatch();
      const claim = await service.claimExecution(eventId);
      if (!claim) throw new Error('Expected execution lease');
      if (condition === 'revoked')
        await sql`update firm_members set deleted_at = now() where firm_id = ${firmId}`;
      if (condition === 'downgraded')
        await sql`update firm_members set role = 'readonly' where firm_id = ${firmId}`;
      if (condition === 'deleted firm')
        await sql`update firms set deleted_at = now() where id = ${firmId}`;
      if (condition === 'changed revision')
        await sql`update firms set revision = 2 where id = ${firmId}`;
      await service.executeClaim(claim);
      expect(await job()).toMatchObject({
        status: 'blocked',
        result: null,
        last_error_code: condition === 'changed revision' ? 'SOURCE_CHANGED' : 'ACCESS_REVOKED',
      });
      expect(await history()).toMatchObject([
        {
          status: 'blocked',
          error_code: condition === 'changed revision' ? 'SOURCE_CHANGED' : 'ACCESS_REVOKED',
        },
      ]);
    },
  );

  it.each([
    ['unsupported.event.v1', { firmId, revision: 1 }, 'UNSUPPORTED_EVENT'],
    ['firm.renamed.v1', { firmId: randomUUID(), revision: 1 }, 'INVALID_EVENT'],
    ['firm.renamed.v1', { firmId, revision: 1, instructions: 'do other work' }, 'INVALID_EVENT'],
  ])('blocks untrusted or unsupported event %s', async (type, payload, code) => {
    await sql`delete from outbox_events where id = ${eventId}`;
    eventId = await insertEvent(type as string, payload);
    await service.dispatchBatch();
    await service.process(eventId);
    expect(await job()).toMatchObject({ status: 'blocked', last_error_code: code, result: null });
  });

  it('rolls back a failed result transaction and retries after repair', async () => {
    await service.dispatchBatch();
    await sql`alter table job_executions add constraint test_result_failure check (result is null)`;
    await service.process(eventId);
    expect(await job()).toMatchObject({
      status: 'retry',
      attempts: 1,
      result: null,
      last_error_code: 'PROCESSING_FAILED',
    });
    const [pending] =
      await sql`select dispatched_at, available_at > now() as delayed from outbox_events where id = ${eventId}`;
    expect(pending).toEqual({ dispatched_at: null, delayed: true });
    await sql`alter table job_executions drop constraint test_result_failure`;
    await sql`update job_executions set available_at = now() where id = ${eventId}`;
    await service.process(eventId);
    expect(await job()).toMatchObject({ status: 'succeeded', attempts: 2, last_error_code: null });
    expect(await history()).toMatchObject([
      { attempt_number: 1, status: 'retry', error_code: 'PROCESSING_FAILED' },
      { attempt_number: 2, status: 'succeeded', error_code: null },
    ]);
  });

  it('persists exhausted processing failure without pretending success', async () => {
    await service.dispatchBatch();
    await sql`update job_executions set attempts = 4 where id = ${eventId}`;
    const claimed = await service.claimExecution(eventId);
    if (!claimed) throw new Error('Expected lease');
    await service.failExecution(claimed);
    expect(await job()).toMatchObject({
      status: 'failed',
      attempts: 5,
      last_error_code: 'PROCESSING_FAILED',
      result: null,
    });
    await service.process(eventId);
    expect((await job())?.attempts).toBe(5);
    // Counts from before recording started do not become invented attempt rows.
    expect(await history()).toMatchObject([
      { attempt_number: 5, status: 'failed', error_code: 'PROCESSING_FAILED' },
    ]);
  });

  it('a fifth crashed attempt ends visibly and cannot be reclaimed indefinitely', async () => {
    await service.dispatchBatch();
    await sql`update job_executions set attempts = 4 where id = ${eventId}`;
    await service.claimExecution(eventId);
    await sql`update job_executions set lease_until = now() - interval '1 second' where id = ${eventId}`;
    expect(await service.claimExecution(eventId)).toBeNull();
    expect(await job()).toMatchObject({
      status: 'failed',
      attempts: 5,
      last_error_code: 'ATTEMPTS_EXHAUSTED',
    });
    expect(await history()).toMatchObject([
      { attempt_number: 5, status: 'interrupted', error_code: 'LEASE_EXPIRED' },
    ]);
  });

  it('keeps attempt outcomes atomic with the job result and rejects history rewrites', async () => {
    await service.dispatchBatch();
    const claim = await service.claimExecution(eventId);
    if (!claim) throw new Error('Expected lease');
    await sql`alter table job_execution_attempts add constraint test_history_failure check (status <> 'succeeded')`;
    await expect(service.executeClaim(claim)).rejects.toThrow();
    expect(await job()).toMatchObject({ status: 'running', result: null });
    expect(await history()).toMatchObject([{ status: 'running', finished_at: null }]);
    await sql`alter table job_execution_attempts drop constraint test_history_failure`;
    await service.executeClaim(claim);
    await expect(sql`update job_execution_attempts set status = 'failed', error_code = 'PROCESSING_FAILED'
      where job_id = ${eventId}`).rejects.toThrow('Attempt history');
    await expect(sql`update job_execution_attempts set attempt_number = 2
      where job_id = ${eventId}`).rejects.toThrow('Attempt history');
    expect(await history()).toMatchObject([{ status: 'succeeded', error_code: null }]);
  });

  it('rolls back a claim if its history cannot be retained', async () => {
    await service.dispatchBatch();
    await sql`alter table job_execution_attempts add constraint test_claim_failure check (attempt_number <> 1)`;
    try {
      await expect(service.claimExecution(eventId)).rejects.toThrow();
      expect(await job()).toMatchObject({ status: 'pending', attempts: 0, lease_token: null });
      expect(await history()).toEqual([]);
    } finally {
      await sql`alter table job_execution_attempts drop constraint test_claim_failure`;
    }
  });
});

it('claims at most 25 events per dispatch and preserves remaining pending work', async () => {
  for (let count = 0; count < 30; count++) await insertEvent();
  const first = await service.claimDispatch();
  expect(first).toHaveLength(25);
  expect(new Set(first.map((row) => row.id)).size).toBe(25);
  const second = await service.claimDispatch();
  expect(second).toHaveLength(6);
});
