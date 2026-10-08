import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local database required');
const sql = postgres(url, { max: 4 });
const user = randomUUID(),
  stranger = randomUUID(),
  first = randomUUID(),
  second = randomUUID(),
  foreign = randomUUID();
const session = randomUUID(),
  otherSession = randomUUID(),
  foreignSession = randomUUID();
let app: INestApplication, base: string;
async function token(sid: string | null = session, firm: string = first, revision?: number) {
  return new SignJWT({
    role: 'authenticated',
    firm_id: firm,
    user_role: 'owner',
    ...(sid ? { session_id: sid } : {}),
    ...(revision === undefined ? {} : { staff_context_revision: revision }),
  })
    .setSubject(user)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
}
async function select(
  firmId = second,
  expectedRevision = 0,
  key = randomUUID(),
  sid: string | null = session,
  extra = {},
) {
  return fetch(`${base}/auth/active-firm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await token(sid)}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({ firmId, expectedRevision, ...extra }),
  });
}
beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const id of [user, stranger])
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${id},${`${id}@selection.test`},now(),'{}'::jsonb)`;
  await sql`insert into auth.sessions(id,user_id) values (${session},${user}),(${otherSession},${user}),(${foreignSession},${stranger})`;
  await sql`insert into firms(id,name) values (${first},'First workspace'),(${second},'Second workspace'),(${foreign},'Private workspace')`;
  await sql`insert into firm_members(firm_id,user_id,role,created_at) values (${first},${user},'readonly',now()-interval '1 day'),(${second},${user},'attorney',now()),(${foreign},${stranger},'owner',now())`;
  app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
async function cleanup() {
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role = replica`; // test-owned records only; never production corrections
    if ((await tx`select to_regclass('public.staff_session_contexts') as name`)[0]?.name)
      await tx`delete from staff_session_contexts where created_by=${user}`;
    await tx`delete from audit_logs where created_by=${user}`;
    await tx`delete from command_receipts where created_by=${user}`;
    await tx`delete from outbox_events where created_by=${user}`;
  });
}
beforeEach(async () => {
  await cleanup();
});
afterAll(async () => {
  await app?.close();
  await cleanup();
  await sql`delete from firm_members where user_id in (${user},${stranger})`;
  await sql`delete from firms where id in (${first},${second},${foreign})`;
  await sql`delete from auth.users where id in (${user},${stranger})`;
  await sql.end();
});
it('saves only this login session, returns a refresh receipt and commits one audit on concurrent retry', async () => {
  const key = randomUUID();
  const responses = await Promise.all([select(second, 0, key), select(second, 0, key)]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const bodies = await Promise.all(responses.map((r) => r.json()));
  expect(bodies[0]).toEqual(bodies[1]);
  expect(bodies[0]).toMatchObject({
    userId: user,
    firmId: second,
    revision: 1,
    requiresSessionRefresh: true,
  });
  expect(responses[0]!.headers.get('cache-control')).toBe('no-store');
  expect(
    (await sql`select firm_id,revision from staff_session_contexts where session_id=${session}`)[0],
  ).toEqual({ firm_id: second, revision: 1 });
  expect(
    (
      await sql`select count(*)::int as n from staff_session_contexts where session_id=${otherSession}`
    )[0]?.n,
  ).toBe(0);
  expect(
    (
      await sql`select count(*)::int as n from audit_logs where created_by=${user} and action='staff.context.select.v1'`
    )[0]?.n,
  ).toBe(1);
});
it('denies foreign, revoked and deleted targets without creating selection or audit', async () => {
  expect((await select(foreign)).status).toBe(403);
  await sql`update firm_members set deleted_at=now() where user_id=${user} and firm_id=${second}`;
  try {
    expect((await select()).status).toBe(403);
  } finally {
    await sql`update firm_members set deleted_at=null where user_id=${user}`;
  }
  await sql`update firms set deleted_at=now() where id=${second}`;
  try {
    expect((await select()).status).toBe(403);
  } finally {
    await sql`update firms set deleted_at=null where id=${second}`;
  }
  expect(
    (await sql`select count(*)::int as n from audit_logs where created_by=${user}`)[0]?.n,
  ).toBe(0);
});
it('requires a live owned session and confirmed account; rejects caller-supplied authority', async () => {
  for (const sid of [null, foreignSession, randomUUID()])
    expect((await select(second, 0, randomUUID(), sid)).status).toBe(403);
  expect((await select(second, 0, randomUUID(), session, { userId: stranger })).status).toBe(422);
  await sql`update auth.users set banned_until=now()+interval '1 hour' where id=${user}`;
  try {
    expect((await select()).status).toBe(403);
  } finally {
    await sql`update auth.users set banned_until=null where id=${user}`;
  }
  await sql`update auth.sessions set not_after=now()-interval '1 minute' where id=${session}`;
  try {
    expect((await select()).status).toBe(403);
  } finally {
    await sql`update auth.sessions set not_after=null where id=${session}`;
  }
});
it('rejects changed key payloads and competing revisions; never restores an older selection on replay', async () => {
  const key = randomUUID();
  expect((await select(second, 0, key)).status).toBe(200);
  expect((await select(first, 0, key)).status).toBe(409);
  expect((await select(first, 0)).status).toBe(409);
  expect((await select(first, 1)).status).toBe(200);
  expect((await select(second, 0, key)).status).toBe(409);
  expect(
    (await sql`select firm_id,revision from staff_session_contexts where session_id=${session}`)[0],
  ).toEqual({ firm_id: first, revision: 2 });
});
it('denies the previous workspace token immediately and even after switching back; another device stays active', async () => {
  expect((await select()).status).toBe(200);
  const read = async (sid: string, firm: string, revision?: number) =>
    fetch(`${base}/firms/current`, {
      headers: { Authorization: `Bearer ${await token(sid, firm, revision)}` },
    });
  expect((await read(session, first)).status).toBe(403);
  expect((await read(otherSession, first)).status).toBe(200);
  expect((await read(session, second, 1)).status).toBe(200);
  expect((await select(first, 1)).status).toBe(200);
  expect((await read(session, first)).status).toBe(403);
  expect((await read(session, second, 1)).status).toBe(403);
  expect((await read(session, first, 2)).status).toBe(200);
});
it('rechecks target revocation on replay and can discover another target with a stale active token', async () => {
  const key = randomUUID();
  expect((await select(second, 0, key)).status).toBe(200);
  await sql`update firm_members set deleted_at=now() where user_id=${user} and firm_id=${second}`;
  try {
    expect((await select(second, 0, key)).status).toBe(403);
    expect((await select(first, 1)).status).toBe(200);
  } finally {
    await sql`update firm_members set deleted_at=null where user_id=${user}`;
  }
});
it('reads authoritative selection independently of stale claims and rejects duplicate competing selections', async () => {
  const read = async () =>
    fetch(`${base}/auth/active-firm`, { headers: { Authorization: `Bearer ${await token()}` } });
  expect(await (await read()).json()).toEqual({ userId: user, firmId: first, revision: 0 });
  const responses = await Promise.all([select(second), select(first)]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  const response = responses.find((r) => r.status === 200)!;
  const applied = (await response.json()) as { firmId: string };
  expect(await (await read()).json()).toEqual({
    userId: user,
    firmId: applied.firmId,
    revision: 1,
  });
});
it('enforces stale selected context and revoked sessions on database reads, and prevents direct context writes', async () => {
  expect((await select()).status).toBe(200);
  const read = async (sid: string, firmId: string, revision?: number) =>
    sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: user, role: 'authenticated', session_id: sid, firm_id: firmId, staff_context_revision: revision })},true)`;
      await tx`set local role authenticated`;
      return tx`select id from public.firms order by id`;
    });
  expect(await read(session, first)).toEqual([]);
  expect(await read(session, second, 1)).toEqual([{ id: second }]);
  expect(await read(otherSession, first)).toEqual([{ id: first }]);
  await expect(
    sql.begin(async (tx) => {
      await tx`set local role authenticated`;
      await tx`update staff_session_contexts set revision=2`;
    }),
  ).rejects.toMatchObject({ code: '42501' });
  await sql`update auth.sessions set not_after=now()-interval '1 minute' where id=${session}`;
  try {
    expect(await read(session, second, 1)).toEqual([]);
  } finally {
    await sql`update auth.sessions set not_after=null where id=${session}`;
  }
});

it('serializes switching with an already authorized write so old scope cannot commit after selection', async () => {
  await sql`update firm_members set role='owner' where user_id=${user} and firm_id=${first}`;
  let release!: () => void, locked!: () => void;
  const ready = new Promise<void>((resolve) => {
      locked = resolve;
    }),
    gate = new Promise<void>((resolve) => {
      release = resolve;
    });
  const blocker = sql.begin(async (tx) => {
    await tx`select id from firms where id=${first} for update`;
    locked();
    await gate;
  });
  await ready;
  let rename: Promise<Response> | undefined, switchFirm: Promise<Response> | undefined;
  try {
    rename = fetch(`${base}/firms/current/name`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${await token()}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({ name: 'Serialized write', expectedRevision: 0 }),
    });
    let waiting = false;
    for (let i = 0; i < 100; i++) {
      waiting = Boolean(
        (
          await sql`select 1 from pg_stat_activity where wait_event_type='Lock' and query like 'select id from public.firms%for update%'`
        )[0],
      );
      if (waiting) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(waiting).toBe(true);
    switchFirm = select();
    const outcome = await Promise.race([
      switchFirm.then(() => 'applied'),
      new Promise<string>((resolve) => setTimeout(() => resolve('waiting'), 150)),
    ]);
    expect(outcome).toBe('waiting');
    release();
    await blocker;
    expect((await rename).status).toBe(200);
    expect((await switchFirm).status).toBe(200);
    expect(
      (
        await fetch(`${base}/firms/current`, {
          headers: { Authorization: `Bearer ${await token()}` },
        })
      ).status,
    ).toBe(403);
  } finally {
    release();
    await blocker;
    await Promise.allSettled([rename, switchFirm]);
    await sql`update firm_members set role='readonly' where user_id=${user} and firm_id=${first}`;
  }
});
