import 'reflect-metadata';
import { staffInvitationCommandResultSchema } from '@lawfirm/core';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local database required');
const sql = postgres(url, { max: 4 });
const owner = randomUUID(),
  recipient = randomUUID(),
  outsider = randomUUID(),
  firm = randomUUID(),
  otherFirm = randomUUID();
const email = `${recipient}@invitation.test`;
let app: INestApplication, base: string;
async function token(user = owner, activeFirm: string | null = firm, claimedEmail = email) {
  return new SignJWT({
    role: 'authenticated',
    user_role: 'owner',
    email: claimedEmail,
    ...(activeFirm ? { firm_id: activeFirm } : {}),
  })
    .setSubject(user)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
}
async function request(
  path: string,
  body?: unknown,
  key: string = randomUUID(),
  user = owner,
  activeFirm: string | null = firm,
) {
  return fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${await token(user, activeFirm)}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
      'X-Request-Id': randomUUID(),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const prepare = (
  body: unknown = { email, role: 'attorney' },
  key: string = randomUUID(),
  user = owner,
  activeFirm: string | null = firm,
) => request('/firms/current/staff-invitations', body, key, user, activeFirm);
async function invitation() {
  const response = await prepare();
  expect(response.status).toBe(200);
  return staffInvitationCommandResultSchema.parse(await response.json());
}
async function clear() {
  // Before the additive migration exists, still establish genuine missing-route failures.
  const [exists] = await sql`select to_regclass('public.staff_invitations') is not null as present`;
  if (exists?.present)
    await sql`delete from staff_invitations where firm_id in (${firm},${otherFirm})`;
  for (const table of [
    'execution_recoveries',
    'job_execution_attempts',
    'job_executions',
    'outbox_events',
    'command_receipts',
  ])
    await sql`delete from ${sql(table)} where firm_id in (${firm},${otherFirm})`;
  await sql`delete from firm_members where user_id = ${recipient}`;
}
beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const user of [owner, recipient, outsider])
    await sql`insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@invitation.test`},now(),'{}'::jsonb)`;
  await sql`insert into firms (id,name) values (${firm},'Invitation firm'),(${otherFirm},'Other private firm')`;
  await sql`insert into firm_members (firm_id,user_id,role) values (${firm},${owner},'owner'),(${otherFirm},${outsider},'owner')`;
  app = await NestFactory.create(AppModule, { logger: false });
  app.get(ConfigService).set('SUPABASE_URL', 'http://127.0.0.1:54321');
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
beforeEach(async () => {
  await clear();
  await sql`update firm_members set role='owner',deleted_at=null where firm_id=${firm} and user_id=${owner}`;
  await sql`update firms set deleted_at=null where id=${firm}`;
  await sql`update auth.users set email=${email},email_confirmed_at=now(),banned_until=null,deleted_at=null where id=${recipient}`;
});
afterAll(async () => {
  await app?.close();
  await clear();
  await sql`delete from firm_members where firm_id in (${firm},${otherFirm})`;
  await sql`delete from firms where id in (${firm},${otherFirm})`;
  await sql`delete from auth.users where id in (${owner},${recipient},${outsider})`;
  await sql.end();
});
it('prepares a durable invitation, audit and outbox with truthful unavailable email delivery', async () => {
  const value = await invitation();
  const [stored] =
    await sql`select email,role,status,revision,created_by,expires_at > now() as unexpired from staff_invitations where id=${value.invitationId}`;
  expect(stored).toEqual({
    email,
    role: 'attorney',
    status: 'pending',
    revision: 1,
    created_by: owner,
    unexpired: true,
  });
  const response = await request('/firms/current/staff-invitations');
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toMatchObject({
    firmId: firm,
    items: [{ id: value.invitationId, email, status: 'pending', delivery: 'unavailable' }],
    nextCursor: null,
  });
  expect(
    (await sql`select count(*)::int as n from audit_logs where command_id=${value.commandId}`)[0]
      ?.n,
  ).toBe(1);
  expect(
    (
      await sql`select event_type,payload from outbox_events where command_id=${value.commandId}`
    )[0],
  ).toEqual({
    event_type: 'staff.invitation-check-requested.v1',
    payload: { firmId: firm, invitationId: value.invitationId, revision: 1 },
  });
  expect(
    (await sql`select count(*)::int as n from firm_members where user_id=${recipient}`)[0]?.n,
  ).toBe(0);
});
it('replays one prepared intent, rejects payload reuse and prevents parallel duplicate invitations', async () => {
  const key = randomUUID(),
    body = { email, role: 'attorney' };
  const responses = await Promise.all([prepare(body, key), prepare(body, key)]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  expect(await responses[0]!.json()).toEqual(await responses[1]!.json());
  expect((await prepare({ email, role: 'billing' }, key)).status).toBe(409);
  expect((await prepare()).status).toBe(409);
  await clear();
  const racing = await Promise.all([prepare(), prepare()]);
  expect(racing.map((r) => r.status).sort()).toEqual([200, 409]);
});
it('uses live manager authority for reads/writes/replay and rejects cross-firm claims', async () => {
  const key = randomUUID();
  expect((await prepare({ email, role: 'attorney' }, key)).status).toBe(200);
  for (const role of ['attorney', 'paralegal', 'billing', 'readonly']) {
    await sql`update firm_members set role=${role} where user_id=${owner} and firm_id=${firm}`;
    expect((await request('/firms/current/staff-invitations')).status).toBe(403);
    expect((await prepare({ email, role: 'attorney' }, key)).status).toBe(403);
  }
  expect((await prepare(undefined, randomUUID(), owner, otherFirm)).status).toBe(403);
  await sql`update firm_members set role='admin' where user_id=${owner} and firm_id=${firm}`;
  expect((await request('/firms/current/staff-invitations')).status).toBe(200);
  await sql`update firm_members set deleted_at=now() where user_id=${owner} and firm_id=${firm}`;
  expect((await prepare({ email, role: 'attorney' }, key)).status).toBe(403);
});
it('revokes a reviewed pending invitation once and makes stale acceptance unavailable', async () => {
  const value = await invitation(),
    key = randomUUID(),
    path = `/firms/current/staff-invitations/${value.invitationId}/revocation`;
  expect((await request(path, { expectedRevision: 99 })).status).toBe(409);
  const responses = await Promise.all([
    request(path, { expectedRevision: 1 }, key),
    request(path, { expectedRevision: 1 }, key),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  expect(await responses[0]!.json()).toEqual(await responses[1]!.json());
  expect(
    (
      await sql`select status,revision,revoked_by from staff_invitations where id=${value.invitationId}`
    )[0],
  ).toEqual({ status: 'revoked', revision: 2, revoked_by: owner });
  expect(
    (
      await request(
        `/staff-invitations/${value.invitationId}/acceptance`,
        { expectedRevision: 1 },
        randomUUID(),
        recipient,
        null,
      )
    ).status,
  ).toBe(404);
  expect((await request(path, { expectedRevision: 2 })).status).toBe(409);
  expect(
    (
      await request(
        `/firms/current/staff-invitations/${value.invitationId}/revocation`,
        { expectedRevision: 1 },
        randomUUID(),
        outsider,
        otherFirm,
      )
    ).status,
  ).toBe(404);
});
it('accepts only the intended confirmed live account, ignoring a stale or forged email claim', async () => {
  const value = await invitation();
  expect(
    (await request('/staff-invitations/received', undefined, randomUUID(), outsider, null)).status,
  ).toBe(200);
  expect(
    await (
      await request('/staff-invitations/received', undefined, randomUUID(), outsider, null)
    ).json(),
  ).toMatchObject({ userId: outsider, items: [] });
  expect(
    (
      await request(
        `/staff-invitations/${value.invitationId}/acceptance`,
        { expectedRevision: 1 },
        randomUUID(),
        outsider,
        null,
      )
    ).status,
  ).toBe(404);
  const received = await request(
    '/staff-invitations/received',
    undefined,
    randomUUID(),
    recipient,
    null,
  );
  expect(received.status).toBe(200);
  expect(await received.json()).toMatchObject({
    userId: recipient,
    items: [
      { id: value.invitationId, firmId: firm, firmName: 'Invitation firm', role: 'attorney' },
    ],
  });
  for (const change of [
    'email_confirmed_at = null',
    "banned_until = now() + interval '1 hour'",
    'deleted_at = now()',
  ]) {
    await sql.unsafe(`update auth.users set ${change} where id = '${recipient}'`);
    expect(
      (
        await request(
          `/staff-invitations/${value.invitationId}/acceptance`,
          { expectedRevision: 1 },
          randomUUID(),
          recipient,
          null,
        )
      ).status,
    ).toBe(403);
    await sql`update auth.users set email_confirmed_at=now(),banned_until=null,deleted_at=null where id=${recipient}`;
  }
  await sql`update auth.users set email=${`changed-${email}`} where id=${recipient}`;
  expect(
    (
      await request(
        `/staff-invitations/${value.invitationId}/acceptance`,
        { expectedRevision: 1 },
        randomUUID(),
        recipient,
        null,
      )
    ).status,
  ).toBe(404);
});
it('commits one staff grant on concurrent acceptance and revalidates membership on replay', async () => {
  const value = await invitation(),
    key = randomUUID(),
    path = `/staff-invitations/${value.invitationId}/acceptance`,
    body = { expectedRevision: 1 };
  const responses = await Promise.all([
    request(path, body, key, recipient, null),
    request(path, body, key, recipient, null),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const result = staffInvitationCommandResultSchema.parse(await responses[0]!.json());
  expect(await responses[1]!.json()).toEqual(result);
  expect(result).toMatchObject({ status: 'accepted', revision: 2, requiresSessionRefresh: true });
  expect(
    (await sql`select role from firm_members where user_id=${recipient} and firm_id=${firm}`)[0]
      ?.role,
  ).toBe('attorney');
  expect(
    (await sql`select count(*)::int as n from audit_logs where command_id=${result.commandId}`)[0]
      ?.n,
  ).toBe(1);
  await sql`update firm_members set deleted_at=now() where user_id=${recipient} and firm_id=${firm}`;
  expect((await request(path, body, key, recipient, null)).status).toBe(403);
});
it('rejects expiration, issuer revocation and stale review, without upgrading existing or revoked members', async () => {
  const value = await invitation(),
    path = `/staff-invitations/${value.invitationId}/acceptance`;
  expect((await request(path, { expectedRevision: 2 }, randomUUID(), recipient, null)).status).toBe(
    409,
  );
  await sql`update firm_members set role='attorney' where user_id=${owner} and firm_id=${firm}`;
  expect((await request(path, { expectedRevision: 1 }, randomUUID(), recipient, null)).status).toBe(
    404,
  );
  await sql`update firm_members set role='owner' where user_id=${owner} and firm_id=${firm}`;
  await sql`insert into firm_members (firm_id,user_id,role,deleted_at) values (${firm},${recipient},'readonly',now())`;
  expect((await request(path, { expectedRevision: 1 }, randomUUID(), recipient, null)).status).toBe(
    409,
  );
  expect(
    (
      await sql`select role,deleted_at is not null as revoked from firm_members where user_id=${recipient}`
    )[0],
  ).toEqual({ role: 'readonly', revoked: true });
  await sql`delete from firm_members where user_id=${recipient}`;
  // Expiry fixture is inserted directly with an expired immutable source rather than rewriting provenance.
  await clear();
  await sql`insert into staff_invitations (id,firm_id,email,role,created_by,expires_at) values (${value.invitationId},${firm},${email},'attorney',${owner},now()-interval '1 second')`;
  expect((await request(path, { expectedRevision: 1 }, randomUUID(), recipient, null)).status).toBe(
    404,
  );
});
it('rejects authority fields, owner invitations and malformed identities', async () => {
  for (const body of [
    { email, role: 'owner' },
    { email, role: 'attorney', userId: recipient },
    { email: 'bad', role: 'attorney' },
  ])
    expect((await prepare(body)).status).toBe(422);
  expect((await prepare({ email, role: 'attorney' }, 'bad-key')).status).toBe(422);
  expect(
    (
      await request(
        '/staff-invitations/bad/acceptance',
        { expectedRevision: 1 },
        randomUUID(),
        recipient,
        null,
      )
    ).status,
  ).toBe(422);
  expect((await request('/firms/current/staff-invitations?beforeId=' + randomUUID())).status).toBe(
    422,
  );
});
it('rolls back the staff grant and acceptance when its outbox cannot commit', async () => {
  const value = await invitation(),
    constraint = `test_invite_${randomUUID().replaceAll('-', '')}`;
  await sql`alter table outbox_events add constraint ${sql(constraint)} check (created_by <> ${sql.unsafe(`'${recipient}'::uuid`)})`;
  try {
    expect(
      (
        await request(
          `/staff-invitations/${value.invitationId}/acceptance`,
          { expectedRevision: 1 },
          randomUUID(),
          recipient,
          null,
        )
      ).status,
    ).toBe(500);
    expect(
      (await sql`select status,revision from staff_invitations where id=${value.invitationId}`)[0],
    ).toEqual({ status: 'pending', revision: 1 });
    expect(
      (await sql`select count(*)::int as n from firm_members where user_id=${recipient}`)[0]?.n,
    ).toBe(0);
  } finally {
    await sql`alter table outbox_events drop constraint ${sql(constraint)}`;
  }
});
it('uses a bounded stable cursor with equal timestamps and never leaks another firm', async () => {
  const stamp = '2026-10-07T12:00:00.000Z';
  for (let i = 0; i < 21; i++)
    await sql`insert into staff_invitations (firm_id,email,role,created_by,created_at,expires_at) values (${firm},${`page-${i}-${email}`},'attorney',${owner},${stamp},now()+interval '7 days')`;
  const first = (await (await request('/firms/current/staff-invitations')).json()) as {
    items: { id: string }[];
    nextCursor: { beforeId: string; beforeCreatedAt: string };
  };
  expect(first.items).toHaveLength(20);
  const second = (await (
    await request('/firms/current/staff-invitations?' + new URLSearchParams(first.nextCursor))
  ).json()) as { items: { id: string }[]; nextCursor: null };
  expect(second.items).toHaveLength(1);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.items, ...second.items].map((i) => i.id)).size).toBe(21);
});
it('rechecks expiry after a blocked row lock and rolls back without granting access', async () => {
  const id = randomUUID();
  await sql`insert into staff_invitations (id,firm_id,email,role,created_by,expires_at) values (${id},${firm},${email},'attorney',${owner},clock_timestamp()+interval '750 milliseconds')`;
  let pending: Promise<Response> | undefined;
  await sql.begin(async (tx) => {
    await tx`select id from staff_invitations where id=${id} for update`;
    pending = request(
      `/staff-invitations/${id}/acceptance`,
      { expectedRevision: 1 },
      randomUUID(),
      recipient,
      null,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
  expect((await pending!).status).toBe(404);
  expect(
    (await sql`select count(*)::int as n from firm_members where user_id=${recipient}`)[0]?.n,
  ).toBe(0);
});
it('does not duplicate grants with distinct action keys or revoke an accepted membership', async () => {
  const value = await invitation(),
    path = `/staff-invitations/${value.invitationId}/acceptance`;
  const replies = await Promise.all([
    request(path, { expectedRevision: 1 }, randomUUID(), recipient, null),
    request(path, { expectedRevision: 1 }, randomUUID(), recipient, null),
  ]);
  expect(replies.map((r) => r.status).sort()).toEqual([200, 404]);
  expect(
    (
      await request(`/firms/current/staff-invitations/${value.invitationId}/revocation`, {
        expectedRevision: 2,
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await sql`select count(*)::int as n from firm_members where user_id=${recipient} and deleted_at is null`
    )[0]?.n,
  ).toBe(1);
});
it('hides pending invitations when the issuer account becomes unconfirmed', async () => {
  const value = await invitation();
  await sql`update auth.users set email_confirmed_at=null where id=${owner}`;
  try {
    const response = await request(
      '/staff-invitations/received',
      undefined,
      randomUUID(),
      recipient,
      null,
    );
    expect(await response.json()).toMatchObject({ items: [] });
    expect(
      (
        await request(
          `/staff-invitations/${value.invitationId}/acceptance`,
          { expectedRevision: 1 },
          randomUUID(),
          recipient,
          null,
        )
      ).status,
    ).toBe(404);
  } finally {
    await sql`update auth.users set email_confirmed_at=now() where id=${owner}`;
  }
});
