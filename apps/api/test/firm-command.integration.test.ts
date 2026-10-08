import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';
import {
  renameFirmResultSchema,
  firmExecutionListSchema,
  processingReadinessSchema,
  firmExecutionHistorySchema,
} from '@lawfirm/core';
import { ProcessingReadinessService } from '../src/modules/firms/processing-readiness.service';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(databaseUrl).hostname)) {
  throw new Error('Command integration tests require local Postgres');
}
const supabaseUrl = 'http://127.0.0.1:54321';
const jwtSecret = 'super-secret-jwt-token-with-at-least-32-characters-long';
const sql = postgres(databaseUrl, { max: 3 });
const firm = randomUUID();
const otherFirm = randomUUID();
const owner = randomUUID();
const reader = randomUUID();
let app: INestApplication;
let baseUrl: string;
let ownerToken: string;

async function token(user: string, activeFirm = firm, claimedRole = 'owner') {
  return new SignJWT({ role: 'authenticated', firm_id: activeFirm, user_role: claimedRole })
    .setSubject(user)
    .setIssuer(`${supabaseUrl}/auth/v1`)
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(jwtSecret));
}

async function rename(
  name: string,
  expectedRevision: number,
  key = randomUUID(),
  bearer = ownerToken,
) {
  return fetch(`${baseUrl}/firms/current/name`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
      'X-Request-Id': randomUUID(),
    },
    body: JSON.stringify({ name, expectedRevision }),
  });
}

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.SUPABASE_URL = supabaseUrl;
  process.env.SUPABASE_JWT_SECRET = jwtSecret;
  for (const user of [owner, reader]) {
    await sql`insert into auth.users (id, email, raw_user_meta_data)
      values (${user}, ${`${user}@command.test`}, '{}'::jsonb)`;
  }
  await sql`insert into public.firms (id, name) values (${firm}, 'Initial firm'), (${otherFirm}, 'Other firm')`;
  await sql`insert into public.firm_members (firm_id, user_id, role)
    values (${firm}, ${owner}, 'owner'), (${firm}, ${reader}, 'readonly')`;
  ownerToken = await token(owner);
  app = await NestFactory.create(AppModule, { logger: false });
  // ConfigModule may have initialized before the test's environment was set.
  app.get(ConfigService).set('SUPABASE_URL', supabaseUrl);
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

afterAll(async () => {
  await app?.close();
  // Audit records intentionally survive record deletion. A local reset clears this test history.
  for (const table of [
    'job_execution_attempts',
    'job_executions',
    'outbox_events',
    'command_receipts',
  ]) {
    const [exists] = await sql`select to_regclass(${`public.${table}`}) as name`;
    if (exists?.name) await sql`delete from ${sql(table)} where firm_id = ${firm}`;
  }
  await sql`delete from public.firm_members where firm_id = ${firm}`;
  await sql`delete from public.firms where id in (${firm}, ${otherFirm})`;
  await sql`delete from auth.users where id in (${owner}, ${reader})`;
  await sql.end();
});

describe('durable firm command', () => {
  it('reads the current firm and current role instead of a claimed owner role', async () => {
    const response = await fetch(`${baseUrl}/firms/current`, {
      headers: { Authorization: `Bearer ${await token(reader)}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: firm,
      name: 'Initial firm',
      revision: 0,
      canRename: false,
    });
    expect((await rename('Unauthorized', 0, randomUUID(), await token(reader))).status).toBe(403);
  });

  it('concurrent retries commit one update, audit, outbox event and receipt', async () => {
    const key = randomUUID();
    const responses = await Promise.all([
      rename('Renamed firm', 0, key),
      rename('Renamed firm', 0, key),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const [first, replay] = await Promise.all(
      responses.map(async (response) => renameFirmResultSchema.parse(await response.json())),
    );
    expect(replay).toEqual(first);
    expect(first?.firm).toMatchObject({ name: 'Renamed firm', revision: 1 });
    const [row] = await sql`select name, revision from public.firms where id = ${firm}`;
    expect(row).toEqual({ name: 'Renamed firm', revision: 1 });
    for (const table of ['command_receipts', 'audit_logs', 'outbox_events']) {
      const [count] =
        await sql`select count(*)::int as count from ${sql(table)} where firm_id = ${firm}`;
      expect(count?.count, table).toBe(1);
    }
    const [event] =
      await sql`select dispatched_at, payload, request_id from public.outbox_events where firm_id = ${firm}`;
    expect(event?.dispatched_at).toBeNull();
    expect(event?.payload).toEqual({ firmId: firm, revision: 1 });
    expect((await rename('Different intent', 0, key)).status).toBe(409);
    expect((await rename('Stale edit', 0)).status).toBe(409);
  });

  it('denies another firm and a revoked member before serving an existing receipt', async () => {
    const crossFirmRead = await fetch(`${baseUrl}/firms/current`, {
      headers: { Authorization: `Bearer ${await token(owner, otherFirm)}` },
    });
    expect(crossFirmRead.status).toBe(403);
    expect(
      (await rename('Cross firm', 0, randomUUID(), await token(owner, otherFirm))).status,
    ).toBe(403);
    const key = randomUUID();
    expect((await rename('Authorized update', 1, key)).status).toBe(200);
    await sql`update public.firm_members set role = 'readonly' where firm_id = ${firm} and user_id = ${owner}`;
    try {
      expect((await rename('Authorized update', 1, key)).status).toBe(403);
    } finally {
      await sql`update public.firm_members set role = 'owner' where firm_id = ${firm} and user_id = ${owner}`;
    }
    await sql`update public.firm_members set deleted_at = now() where firm_id = ${firm} and user_id = ${owner}`;
    try {
      expect((await rename('Authorized update', 1, key)).status).toBe(403);
      const read = await fetch(`${baseUrl}/firms/current`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      expect(read.status).toBe(403);
    } finally {
      await sql`update public.firm_members set deleted_at = null where firm_id = ${firm} and user_id = ${owner}`;
    }
  });

  it('rolls back the update and receipt if the durable event cannot be recorded', async () => {
    // Inject a transaction failure using an isolated test-specific check, then restore it.
    await sql`alter table public.outbox_events add constraint test_reject_event
      check (firm_id <> ${sql.unsafe(`'${firm}'`)}::uuid) not valid`;
    const key = randomUUID();
    try {
      expect((await rename('Must roll back', 2, key)).status).toBe(500);
      const [row] = await sql`select name, revision from public.firms where id = ${firm}`;
      expect(row).toEqual({ name: 'Authorized update', revision: 2 });
      const [receipt] =
        await sql`select count(*)::int as count from public.command_receipts where idempotency_key = ${key}`;
      expect(receipt?.count).toBe(0);
      const [audit] =
        await sql`select count(*)::int as count from public.audit_logs where firm_id = ${firm}`;
      expect(audit?.count).toBe(2);
    } finally {
      await sql`alter table public.outbox_events drop constraint test_reject_event`;
    }
    expect((await rename('Recovered update', 2, key)).status).toBe(200);
  });

  it('rejects malformed payloads, action keys, and request identifiers without effects', async () => {
    const headers = {
      Authorization: `Bearer ${ownerToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
    };
    for (const body of [
      { name: ' ', expectedRevision: 3 },
      { name: 'Invalid', expectedRevision: 3, firmId: otherFirm },
      { name: 'Invalid', expectedRevision: -1 },
    ]) {
      const response = await fetch(`${baseUrl}/firms/current/name`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(422);
    }
    for (const override of [{ 'Idempotency-Key': 'invalid' }, { 'X-Request-Id': 'invalid' }]) {
      const response = await fetch(`${baseUrl}/firms/current/name`, {
        method: 'PATCH',
        headers: { ...headers, ...override },
        body: JSON.stringify({ name: 'Invalid', expectedRevision: 3 }),
      });
      expect(response.status).toBe(422);
    }
    expect((await fetch(`${baseUrl}/firms/current`)).status).toBe(401);
    const [row] = await sql`select revision from public.firms where id = ${firm}`;
    expect(row?.revision).toBe(3);
  });

  it('denies client access to execution records and preserves immutable audit history', async () => {
    for (const table of [
      'command_receipts',
      'audit_logs',
      'outbox_events',
      'job_executions',
      'job_execution_attempts',
    ]) {
      const [grants] =
        await sql`select has_table_privilege('authenticated', ${table}, 'SELECT') as read,
        has_table_privilege('authenticated', ${table}, 'INSERT') as write`;
      expect(grants).toEqual({ read: false, write: false });
    }
    await expect(
      sql`update public.audit_logs set after = '{}'::jsonb where firm_id = ${firm}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(sql`delete from public.audit_logs where firm_id = ${firm}`).rejects.toMatchObject({
      code: '42501',
    });
  });
});

describe('authorized firm execution inspection', () => {
  it('exposes bounded attempt history only for a currently authorized firm-profile event', async () => {
    const [event] =
      await sql`select id from outbox_events where firm_id = ${firm} order by created_at desc limit 1`;
    if (!event) throw new Error('Expected event');
    const read = (id = event.id, bearer = ownerToken) =>
      fetch(`${baseUrl}/firms/current/executions/${id}/attempts`, {
        headers: { Authorization: `Bearer ${bearer}` },
      });
    const empty = await read();
    expect(empty.status).toBe(200);
    expect(empty.headers.get('cache-control')).toBe('no-store');
    expect(await empty.json()).toEqual({
      jobId: event.id,
      attemptCount: 0,
      unrecordedAttempts: 0,
      items: [],
    });
    expect((await read(randomUUID())).status).toBe(404);
    expect((await fetch(`${baseUrl}/firms/current/executions/${event.id}/attempts`)).status).toBe(
      401,
    );
    expect((await read('invalid')).status).toBe(422);
    expect((await read(event.id, await token(reader))).status).toBe(403);
    expect((await read(event.id, await token(owner, otherFirm))).status).toBe(403);
    await sql`update firm_members set role = 'readonly' where firm_id = ${firm} and user_id = ${owner}`;
    try {
      expect((await read()).status).toBe(403);
    } finally {
      await sql`update firm_members set role = 'owner' where firm_id = ${firm} and user_id = ${owner}`;
    }
    await sql`update firm_members set deleted_at = now() where firm_id = ${firm} and user_id = ${owner}`;
    try {
      expect((await read()).status).toBe(403);
    } finally {
      await sql`update firm_members set deleted_at = null where firm_id = ${firm} and user_id = ${owner}`;
    }
  });
  it('returns bounded allowlisted firm-event status, never payload or result', async () => {
    const [event] =
      await sql`select * from outbox_events where firm_id = ${firm} order by created_at desc limit 1`;
    if (!event) throw new Error('Expected command event');
    await sql`insert into job_executions (id, outbox_event_id, firm_id, created_by, status, result, completed_at)
      values (${event.id}, ${event.id}, ${firm}, ${owner}, 'succeeded', '{"private":"do not expose"}'::jsonb, now())`;
    const request = await fetch(`${baseUrl}/firms/current/executions`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(request.status).toBe(200);
    const body = firmExecutionListSchema.parse(await request.json());
    expect(body.items).toHaveLength(3);
    expect(body.items[0]).toMatchObject({
      id: event.id,
      status: 'succeeded',
      eventType: 'firm.renamed.v1',
      attempts: 0,
    });
    const first = body.items[0];
    if (!first) throw new Error('Expected execution status');
    expect(Object.keys(first).sort()).toEqual(
      [
        'id',
        'commandId',
        'requestId',
        'eventType',
        'status',
        'attempts',
        'dispatchAttempts',
        'availableAt',
        'completedAt',
        'errorCode',
      ].sort(),
    );
    expect(
      body.items.slice(1).every((item: { status: string }) => item.status === 'awaiting_dispatch'),
    ).toBe(true);
    // A future matter/provider event cannot be read under firm-only authorization.
    const privateEvent = randomUUID();
    await sql`insert into outbox_events (id, firm_id, created_by, command_id, request_id, event_type, payload)
      values (${privateEvent}, ${firm}, ${owner}, ${randomUUID()}, ${randomUUID()}, 'matter.private.v1', '{"secret":"restricted"}'::jsonb)`;
    const filtered = await fetch(`${baseUrl}/firms/current/executions`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    expect(firmExecutionListSchema.parse(await filtered.json()).items).toHaveLength(3);
  });
  it('rechecks current capabilities and membership, denying reader, cross-firm and revoked actors', async () => {
    const read = (bearer: string) =>
      fetch(`${baseUrl}/firms/current/executions`, {
        headers: { Authorization: `Bearer ${bearer}` },
      });
    expect((await read(await token(reader))).status).toBe(403);
    expect((await read(await token(owner, otherFirm))).status).toBe(403);
    await sql`update firm_members set role = 'readonly' where firm_id = ${firm} and user_id = ${owner}`;
    try {
      expect((await read(ownerToken)).status).toBe(403);
    } finally {
      await sql`update firm_members set role = 'owner' where firm_id = ${firm} and user_id = ${owner}`;
    }
    await sql`update firm_members set deleted_at = now() where firm_id = ${firm} and user_id = ${owner}`;
    try {
      expect((await read(ownerToken)).status).toBe(403);
    } finally {
      await sql`update firm_members set deleted_at = null where firm_id = ${firm} and user_id = ${owner}`;
    }
    expect((await fetch(`${baseUrl}/firms/current/executions`)).status).toBe(401);
  });
  it('retains explicit incomplete historical coverage and hides private or cross-firm job history', async () => {
    const [job] = await sql`select id from job_executions where firm_id = ${firm} limit 1`;
    if (!job) throw new Error('Expected job');
    await sql`update job_executions set attempts = 2 where id = ${job.id}`;
    await sql`insert into job_execution_attempts (job_id, firm_id, created_by, attempt_number,
      lease_token, lease_until, finished_at, status)
      values (${job.id}, ${firm}, ${owner}, 2, ${randomUUID()}, now() + interval '30 seconds', now(), 'succeeded')`;
    const read = (id: string, bearer = ownerToken) =>
      fetch(`${baseUrl}/firms/current/executions/${id}/attempts`, {
        headers: { Authorization: `Bearer ${bearer}` },
      });
    const response = await read(job.id);
    const history = firmExecutionHistorySchema.parse(await response.json());
    expect(history).toMatchObject({
      jobId: job.id,
      attemptCount: 2,
      unrecordedAttempts: 1,
      items: [{ number: 2, status: 'succeeded', errorCode: null }],
    });
    expect(Object.keys(history.items[0]!).sort()).toEqual(
      ['number', 'status', 'errorCode', 'startedAt', 'finishedAt'].sort(),
    );
    const [privateEvent] =
      await sql`select id from outbox_events where firm_id = ${firm} and event_type = 'matter.private.v1'`;
    expect((await read(privateEvent!.id)).status).toBe(404);
    await sql`insert into firm_members (firm_id, user_id, role) values (${otherFirm}, ${owner}, 'owner')`;
    try {
      expect((await read(job.id, await token(owner, otherFirm))).status).toBe(404);
    } finally {
      await sql`delete from firm_members where firm_id = ${otherFirm}`;
    }
    await sql`update job_executions set deleted_at = now() where id = ${job.id}`;
    try {
      expect((await read(job.id)).status).toBe(404);
    } finally {
      await sql`update job_executions set deleted_at = null where id = ${job.id}`;
    }
  });
});

describe('authorized processing availability', () => {
  const read = (bearer: string) =>
    fetch(`${baseUrl}/firms/current/processing-readiness`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
  it('returns an allowlisted snapshot with no business effects', async () => {
    const before = await sql`select
      (select count(*)::int from command_receipts where firm_id = ${firm}) as commands,
      (select count(*)::int from outbox_events where firm_id = ${firm}) as events`;
    const response = await read(ownerToken);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = processingReadinessSchema.parse(await response.json());
    expect(body).toMatchObject({ database: 'available', validForMs: 15000 });
    expect(Object.keys(body).sort()).toEqual(
      ['checkedAt', 'validForMs', 'database', 'queue', 'worker', 'lastWorkerSeenAt'].sort(),
    );
    expect(
      await sql`select
      (select count(*)::int from command_receipts where firm_id = ${firm}) as commands,
      (select count(*)::int from outbox_events where firm_id = ${firm}) as events`,
    ).toEqual(before);
  });
  it('drops a worker observation that expired while firm access was revalidated', async () => {
    const probe = vi.spyOn(app.get(ProcessingReadinessService), 'inspect').mockResolvedValueOnce({
      queue: 'available',
      worker: 'recently_observed',
      lastWorkerSeenAt: new Date(Date.now() - 16000).toISOString(),
    });
    try {
      const response = await read(ownerToken);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        worker: 'not_observed',
        lastWorkerSeenAt: null,
      });
    } finally {
      probe.mockRestore();
    }
  });
  it('denies absent, claimed-owner, cross-firm and revoked authority', async () => {
    expect((await fetch(`${baseUrl}/firms/current/processing-readiness`)).status).toBe(401);
    expect((await read(await token(reader))).status).toBe(403);
    expect((await read(await token(owner, otherFirm))).status).toBe(403);
    await sql`update firm_members set deleted_at = now() where firm_id = ${firm} and user_id = ${owner}`;
    try {
      expect((await read(ownerToken)).status).toBe(403);
    } finally {
      await sql`update firm_members set deleted_at = null where firm_id = ${firm} and user_id = ${owner}`;
    }
  });
  it('revocation during the queue probe prevents an authorized-looking response', async () => {
    const probe = vi
      .spyOn(app.get(ProcessingReadinessService), 'inspect')
      .mockImplementationOnce(async () => {
        await sql`update firm_members set role = 'readonly' where firm_id = ${firm} and user_id = ${owner}`;
        return { queue: 'available', worker: 'not_observed', lastWorkerSeenAt: null };
      });
    try {
      expect((await read(ownerToken)).status).toBe(403);
    } finally {
      probe.mockRestore();
      await sql`update firm_members set role = 'owner' where firm_id = ${firm} and user_id = ${owner}`;
    }
  });
});

it('limits execution inspection to twenty recent firm events', async () => {
  for (let count = 0; count < 25; count++)
    await sql`insert into outbox_events (firm_id, created_by, command_id, request_id, event_type, payload)
    values (${firm}, ${owner}, ${randomUUID()}, ${randomUUID()}, 'firm.renamed.v1', '{}'::jsonb)`;
  const response = await fetch(`${baseUrl}/firms/current/executions`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  expect(response.status).toBe(200);
  const body = firmExecutionListSchema.parse(await response.json());
  expect(body.items).toHaveLength(20);
  expect(new Set(body.items.map((item: { id: string }) => item.id)).size).toBe(20);
});
