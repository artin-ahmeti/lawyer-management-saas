import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';
import { recoverExecutionResultSchema } from '@lawfirm/core';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname))
  throw new Error('Local database required');
const sql = postgres(databaseUrl, { max: 4 });
const firm = randomUUID();
const otherFirm = randomUUID();
const owner = randomUUID();
const reader = randomUUID();
const secret = 'super-secret-jwt-token-with-at-least-32-characters-long';
let app: INestApplication;
let base: string;
let bearer: string;
let source: string;
const input = {
  reason: 'Reviewed current firm profile',
  expectedRevision: 2,
  expectedSourceRevision: 1,
  expectedStatus: 'failed',
};
async function token(user = owner, activeFirm = firm) {
  return new SignJWT({ role: 'authenticated', firm_id: activeFirm, user_role: 'owner' })
    .setSubject(user)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret));
}
async function clear() {
  for (const table of [
    'execution_recoveries',
    'job_execution_attempts',
    'job_executions',
    'outbox_events',
    'command_receipts',
  ]) {
    const [exists] = await sql`select to_regclass(${`public.${table}`}) as name`;
    if (exists?.name) await sql`delete from ${sql(table)} where firm_id in (${firm}, ${otherFirm})`;
  }
}
function recover(body: unknown = input, key: string = randomUUID(), auth = bearer, job = source) {
  return fetch(`${base}/firms/current/executions/${job}/recovery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
      'X-Request-Id': randomUUID(),
    },
    body: JSON.stringify(body),
  });
}
function review(job = source, auth = bearer) {
  return fetch(`${base}/firms/current/executions/${job}/recovery`, {
    headers: { Authorization: `Bearer ${auth}` },
  });
}
beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = secret;
  for (const user of [owner, reader])
    await sql`insert into auth.users (id, email, raw_user_meta_data) values (${user}, ${`${user}@recovery.test`}, '{}'::jsonb)`;
  await sql`insert into firms (id, name, revision) values (${firm}, 'Recovery LLP', 2), (${otherFirm}, 'Private firm', 2)`;
  await sql`insert into firm_members (firm_id, user_id, role) values (${firm}, ${owner}, 'owner'), (${firm}, ${reader}, 'readonly')`;
  bearer = await token();
  app = await NestFactory.create(AppModule, { logger: false });
  app.get(ConfigService).set('SUPABASE_URL', 'http://127.0.0.1:54321');
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
beforeEach(async () => {
  await clear();
  await sql`update firms set revision = 2 where id = ${firm}`;
  await sql`update firm_members set role = 'owner', deleted_at = null where firm_id = ${firm} and user_id = ${owner}`;
  source = randomUUID();
  await sql`insert into outbox_events (id, firm_id, created_by, command_id, request_id, event_type, payload, dispatched_at)
    values (${source}, ${firm}, ${owner}, ${randomUUID()}, ${randomUUID()}, 'firm.renamed.v1', ${sql.json({ firmId: firm, revision: 1 })}, now())`;
  await sql`insert into job_executions (id, outbox_event_id, firm_id, created_by, status, attempts, completed_at, last_error_code)
    values (${source}, ${source}, ${firm}, ${owner}, 'failed', 5, now(), 'ATTEMPTS_EXHAUSTED')`;
});
afterAll(async () => {
  await app?.close();
  await clear();
  await sql`delete from firm_members where firm_id = ${firm}`;
  await sql`delete from firms where id in (${firm}, ${otherFirm})`;
  await sql`delete from auth.users where id in (${owner}, ${reader})`;
  await sql.end();
});
it('reviews current and source revisions without claiming the failed check succeeded', async () => {
  const response = await review();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    jobId: source,
    firm: { id: firm, name: 'Recovery LLP', revision: 2, canRename: true },
    eligible: true,
    reason: null,
    sourceStatus: 'failed',
    sourceRevision: 1,
    replacementJobId: null,
  });
});
it('concurrent identical intents persist one linked replacement, receipt and audit while preserving failure', async () => {
  const key = randomUUID();
  const responses = await Promise.all([recover(input, key), recover(input, key)]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const first = recoverExecutionResultSchema.parse(await responses[0]!.json());
  expect(await responses[1]!.json()).toEqual(first);
  expect(first).toMatchObject({ sourceJobId: source, status: 'awaiting_dispatch' });
  expect(first.jobId).not.toBe(source);
  const [event] =
    await sql`select event_type, payload, created_by from outbox_events where id = ${first.jobId}`;
  expect(event).toEqual({
    event_type: 'firm.profile-check-requested.v1',
    payload: { firmId: firm, revision: 2 },
    created_by: owner,
  });
  expect(
    (await sql`select count(*)::int as n from command_receipts where id = ${first.commandId}`)[0]
      ?.n,
  ).toBe(1);
  expect(
    (await sql`select count(*)::int as n from audit_logs where command_id = ${first.commandId}`)[0]
      ?.n,
  ).toBe(1);
  expect(
    (await sql`select count(*)::int as n from execution_recoveries where firm_id = ${firm}`)[0]?.n,
  ).toBe(1);
  expect(
    (
      await sql`select status, attempts, last_error_code from job_executions where id = ${source}`
    )[0],
  ).toEqual({ status: 'failed', attempts: 5, last_error_code: 'ATTEMPTS_EXHAUSTED' });
  expect(await (await review()).json()).toMatchObject({
    eligible: false,
    reason: 'ALREADY_RECOVERED',
    replacementJobId: first.jobId,
  });
});
it('serializes different intents for the same failed source', async () => {
  const responses = await Promise.all([recover(), recover()]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(
    (await sql`select count(*)::int as n from execution_recoveries where firm_id = ${firm}`)[0]?.n,
  ).toBe(1);
});
it('rejects stale profile, source revision and outcome reviews', async () => {
  for (const changed of [
    { expectedRevision: 1 },
    { expectedSourceRevision: 2 },
    { expectedStatus: 'blocked' },
  ]) {
    const response = await recover({ ...input, ...changed });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'REVIEW_CONFLICT' });
  }
});
it('rejects running work and malformed or unknown-domain sources', async () => {
  await sql`update job_executions set status = 'pending', completed_at = null where id = ${source}`;
  expect(await (await review()).json()).toMatchObject({ eligible: false, reason: 'NOT_TERMINAL' });
  expect((await recover()).status).toBe(409);
  await sql`update job_executions set status = 'failed', completed_at = now() where id = ${source}`;
  await sql`update outbox_events set payload = '{}'::jsonb where id = ${source}`;
  expect(await (await review()).json()).toMatchObject({
    eligible: false,
    reason: 'SOURCE_INVALID',
  });
  expect((await recover()).status).toBe(409);
  await sql`update outbox_events set event_type = 'matter.private.v1' where id = ${source}`;
  expect((await review()).status).toBe(404);
  expect((await recover()).status).toBe(404);
});
it('enforces live capabilities, active firm, deleted source and authenticated identity', async () => {
  const readerToken = await token(reader);
  expect((await review(source, readerToken)).status).toBe(403);
  expect((await recover(input, randomUUID(), readerToken)).status).toBe(403);
  expect((await review(source, await token(owner, otherFirm))).status).toBe(403);
  expect((await review(randomUUID())).status).toBe(404);
  expect((await fetch(`${base}/firms/current/executions/${source}/recovery`)).status).toBe(401);
  await sql`update job_executions set deleted_at = now() where id = ${source}`;
  expect((await recover()).status).toBe(404);
});
it('revalidates permission before a replay and rejects reused keys with changed input', async () => {
  const key = randomUUID();
  expect((await recover(input, key)).status).toBe(200);
  expect((await recover({ ...input, reason: 'Different review' }, key)).status).toBe(409);
  await sql`update firm_members set deleted_at = now() where firm_id = ${firm} and user_id = ${owner}`;
  expect((await recover(input, key)).status).toBe(403);
});
it('allows a current administrator to request a new check under their own authority', async () => {
  await sql`update firm_members set role = 'admin' where firm_id = ${firm} and user_id = ${owner}`;
  expect((await recover()).status).toBe(200);
});
it('uses a new reviewing actor after the original actor is revoked without reauthorizing the original command', async () => {
  await sql`update firm_members set deleted_at = now() where firm_id = ${firm} and user_id = ${owner}`;
  await sql`update firm_members set role = 'admin' where firm_id = ${firm} and user_id = ${reader}`;
  try {
    const response = await recover(input, randomUUID(), await token(reader));
    expect(response.status).toBe(200);
    const result = recoverExecutionResultSchema.parse(await response.json());
    expect(
      (await sql`select created_by from outbox_events where id = ${result.jobId}`)[0]?.created_by,
    ).toBe(reader);
    expect(
      (await sql`select created_by, status from job_executions where id = ${source}`)[0],
    ).toEqual({ created_by: owner, status: 'failed' });
  } finally {
    await sql`update firm_members set role = 'readonly' where firm_id = ${firm} and user_id = ${reader}`;
  }
});
it('validates strict input, reason and action identity', async () => {
  for (const body of [
    { ...input, reason: '' },
    { ...input, reason: 'a'.repeat(501) },
    { ...input, reason: 'bad\u0000reason' },
    { ...input, actor: owner },
  ])
    expect((await recover(body)).status).toBe(422);
  expect((await recover(input, 'invalid')).status).toBe(422);
});
it('rolls back receipt, audit and relation when the outbox cannot commit', async () => {
  const constraint = `test_recovery_${randomUUID().replaceAll('-', '')}`;
  const [beforeAudit] =
    await sql`select count(*)::int as n from audit_logs where firm_id = ${firm}`;
  await sql`alter table outbox_events add constraint ${sql(constraint)} check (firm_id <> ${sql.unsafe(`'${firm}'::uuid`)} or event_type <> 'firm.profile-check-requested.v1')`;
  try {
    expect((await recover()).status).toBe(500);
    expect(
      (await sql`select count(*)::int as n from command_receipts where firm_id = ${firm}`)[0]?.n,
    ).toBe(0);
    expect(
      (await sql`select count(*)::int as n from execution_recoveries where firm_id = ${firm}`)[0]
        ?.n,
    ).toBe(0);
    expect(
      (await sql`select count(*)::int as n from audit_logs where firm_id = ${firm}`)[0]?.n,
    ).toBe(beforeAudit?.n);
  } finally {
    await sql`alter table outbox_events drop constraint ${sql(constraint)}`;
  }
});
