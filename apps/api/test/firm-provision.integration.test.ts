import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { provisionFirmResultSchema } from '@lawfirm/core';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local database required');
const sql = postgres(url, { max: 4 });
const actor = randomUUID();
let app: INestApplication;
let base: string;
let bearer: string;
async function clear() {
  const memberships = await sql`select firm_id from firm_members where user_id = ${actor}`;
  for (const member of memberships) {
    for (const table of [
      'execution_recoveries',
      'job_execution_attempts',
      'job_executions',
      'outbox_events',
      'command_receipts',
      'firm_members',
    ])
      await sql`delete from ${sql(table)} where firm_id = ${member.firm_id}`;
    await sql`delete from firms where id = ${member.firm_id}`;
  }
}
function create(body: unknown = { name: 'New nationwide firm' }, key: string = randomUUID()) {
  return fetch(`${base}/firms`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
      'X-Request-Id': randomUUID(),
    },
    body: JSON.stringify(body),
  });
}
beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  await sql`insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values (${actor}, ${`${actor}@provision.test`}, now(), '{}'::jsonb)`;
  bearer = await new SignJWT({ role: 'authenticated', user_role: 'owner' })
    .setSubject(actor)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET));
  app = await NestFactory.create(AppModule, { logger: false });
  app.get(ConfigService).set('SUPABASE_URL', 'http://127.0.0.1:54321');
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
beforeEach(async () => {
  await clear();
  await sql`update auth.users set email_confirmed_at = now(), banned_until = null, deleted_at = null where id = ${actor}`;
});
afterAll(async () => {
  await app?.close();
  await clear();
  await sql`delete from auth.users where id = ${actor}`;
  await sql.end();
});
it('atomically creates the first firm, owner membership, receipt, audit and pending check without demo practices', async () => {
  const response = await create();
  expect(response.status).toBe(200);
  const result = provisionFirmResultSchema.parse(await response.json());
  expect(result.requiresSessionRefresh).toBe(true);
  expect(
    (await sql`select name, revision, settings from firms where id = ${result.firmId}`)[0],
  ).toEqual({ name: 'New nationwide firm', revision: 1, settings: {} });
  expect(
    (
      await sql`select role, created_by from firm_members where firm_id = ${result.firmId} and user_id = ${actor}`
    )[0],
  ).toEqual({ role: 'owner', created_by: actor });
  expect(
    (await sql`select count(*)::int as n from practice_areas where firm_id = ${result.firmId}`)[0]
      ?.n,
  ).toBe(0);
  expect(
    (await sql`select count(*)::int as n from audit_logs where command_id = ${result.commandId}`)[0]
      ?.n,
  ).toBe(1);
  expect(
    (
      await sql`select event_type, payload, created_by, dispatched_at from outbox_events where command_id = ${result.commandId}`
    )[0],
  ).toEqual({
    event_type: 'firm.profile-check-requested.v1',
    payload: { firmId: result.firmId, revision: 1 },
    created_by: actor,
    dispatched_at: null,
  });
});
it('replays concurrent identical first-firm intents without creating a second firm or owner grant', async () => {
  const key = randomUUID();
  const body = { name: 'One first firm' };
  const responses = await Promise.all([create(body, key), create(body, key)]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  expect(await responses[0]!.json()).toEqual(await responses[1]!.json());
  expect(
    (await sql`select count(*)::int as n from firm_members where user_id = ${actor}`)[0]?.n,
  ).toBe(1);
});
it('serializes different creation intents and never upgrades an existing membership', async () => {
  const responses = await Promise.all([create({ name: 'First A' }), create({ name: 'First B' })]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  await sql`update firm_members set role = 'readonly' where user_id = ${actor}`;
  expect((await create()).status).toBe(409);
  expect((await sql`select role from firm_members where user_id = ${actor}`)[0]?.role).toBe(
    'readonly',
  );
});
it('rejects a changed input for an existing action key and rechecks access before replay', async () => {
  const key = randomUUID();
  expect((await create({ name: 'First firm' }, key)).status).toBe(200);
  expect((await create({ name: 'Another intent' }, key)).status).toBe(409);
  await sql`update firm_members set deleted_at = now() where user_id = ${actor}`;
  expect((await create({ name: 'First firm' }, key)).status).toBe(403);
});
it('requires a confirmed, available account and does not trust an owner claim for provisioning', async () => {
  await sql`update auth.users set email_confirmed_at = null where id = ${actor}`;
  expect((await create()).status).toBe(403);
  await sql`update auth.users set email_confirmed_at = now(), banned_until = now() + interval '1 hour' where id = ${actor}`;
  expect((await create()).status).toBe(403);
  await sql`update auth.users set banned_until = null, deleted_at = now() where id = ${actor}`;
  expect((await create()).status).toBe(403);
});
it('rejects invalid names, authority fields and missing action identity', async () => {
  for (const body of [
    { name: ' ' },
    { name: 'a'.repeat(201) },
    { name: 'Bad\u0000name' },
    { name: 'Firm', role: 'owner' },
    { name: 'Firm', firmId: randomUUID() },
  ])
    expect((await create(body)).status).toBe(422);
  expect((await create({ name: 'Firm' }, 'bad-key')).status).toBe(422);
  expect(
    (
      await fetch(`${base}/firms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Firm' }),
      })
    ).status,
  ).toBe(401);
});
it('rolls back creation and owner authority when a durable check cannot commit', async () => {
  const constraint = `test_provision_${randomUUID().replaceAll('-', '')}`;
  const [before] = await sql`select count(*)::int as n from audit_logs where created_by = ${actor}`;
  await sql`alter table outbox_events add constraint ${sql(constraint)} check (created_by <> ${sql.unsafe(`'${actor}'::uuid`)})`;
  try {
    expect((await create()).status).toBe(500);
    expect(
      (await sql`select count(*)::int as n from firm_members where user_id = ${actor}`)[0]?.n,
    ).toBe(0);
    expect(
      (await sql`select count(*)::int as n from command_receipts where created_by = ${actor}`)[0]
        ?.n,
    ).toBe(0);
    expect(
      (await sql`select count(*)::int as n from audit_logs where created_by = ${actor}`)[0]?.n,
    ).toBe(before?.n);
  } finally {
    await sql`alter table outbox_events drop constraint ${sql(constraint)}`;
  }
});
