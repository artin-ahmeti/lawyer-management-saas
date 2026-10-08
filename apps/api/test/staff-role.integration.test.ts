import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import {
  createMatterResultSchema,
  firmStaffListSchema,
  staffRoleHistorySchema,
} from '@lawfirm/core';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local DB required');
const sql = postgres(url, { max: 4 });
const firm = randomUUID(),
  foreign = randomUUID();
const users = Array.from({ length: 5 }, () => randomUUID());
const sessions = users.map(() => randomUUID());
const extraUsers: string[] = [];
let app: INestApplication, base: string;
async function token(i = 0, activeFirm: string = i === 4 ? foreign : firm) {
  return new SignJWT({
    role: 'authenticated',
    firm_id: activeFirm,
    user_role: 'owner',
    session_id: sessions[i],
  })
    .setSubject(users[i]!)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
}
async function request(path: string, i = 0, input?: unknown, key: string = randomUUID()) {
  return fetch(`${base}/matters${path}`, {
    method: input ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${await token(i)}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
}
const changeGrant = (
  id: string,
  userId: string,
  role: 'reader' | 'manager' | null,
  revision: number,
  i = 0,
  key: string = randomUUID(),
) =>
  request(
    `/${id}/access-changes`,
    i,
    { userId, role, expectedRevision: revision, reason: 'Assignment reviewed' },
    key,
  );
beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const [i, user] of users.entries()) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@access.test`},now(),'{}'::jsonb)`;
    await sql`insert into auth.sessions(id,user_id) values (${sessions[i]!},${user})`;
  }
  await sql`insert into firms(id,name) values (${firm},'Access test firm'),(${foreign},'Foreign access firm')`;
  for (const [i, user] of users.entries())
    await sql`insert into firm_members(firm_id,user_id,role) values (${i === 4 ? foreign : firm},${user},${i === 1 ? 'admin' : i === 2 ? 'attorney' : 'owner'})`;
  app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role=replica`;
    await tx`delete from audit_logs where firm_id in (${firm},${foreign})`;
    await tx`delete from command_receipts where firm_id in (${firm},${foreign})`;
    await tx`delete from matter_access where firm_id in (${firm},${foreign})`;
    await tx`delete from matters where firm_id in (${firm},${foreign})`;
  });
  await sql`delete from firm_members where firm_id in (${firm},${foreign})`;
  await sql`delete from firms where id in (${firm},${foreign})`;
  for (const user of [...users, ...extraUsers]) await sql`delete from auth.users where id=${user}`;
  await sql.end();
});

beforeEach(async () => {
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role=replica`;
    await tx`delete from audit_logs where firm_id=${firm}`;
    await tx`delete from command_receipts where firm_id=${firm}`;
    await tx`delete from matter_access where firm_id=${firm}`;
    await tx`delete from matters where firm_id=${firm}`;
  });
  for (const [i, user] of users.entries()) {
    await sql`update auth.users set banned_until=null,deleted_at=null,email_confirmed_at=now() where id=${user}`;
    await sql`update auth.sessions set not_after=null where id=${sessions[i]!}`;
    await sql`update firm_members set role=${i === 1 ? 'admin' : i === 2 ? 'attorney' : 'owner'},revision=1,deleted_at=null where user_id=${user}`;
  }
});
async function staff(path = '', i = 0, input?: unknown, key = randomUUID()) {
  return fetch(`${base}/firms/current/staff${path}`, {
    method: input ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${await token(i)}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
}
const roleChange = (i: number, role: string, revision = 1, actor = 0, key = randomUUID()) =>
  staff(
    '/role-changes',
    actor,
    { userId: users[i], role, expectedRevision: revision, reason: 'Responsibilities reviewed' },
    key,
  );
it('records one role change under concurrent replay and rejects changed intent or stale review', async () => {
  const key = randomUUID();
  const responses = await Promise.all([
    roleChange(2, 'paralegal', 1, 0, key),
    roleChange(2, 'paralegal', 1, 0, key),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const result = await responses[0]!.json();
  expect(await responses[1]!.json()).toEqual(result);
  expect(result).toMatchObject({ firmId: firm, userId: users[2], role: 'paralegal', revision: 2 });
  expect(
    (
      await sql`select role,revision from firm_members where firm_id=${firm} and user_id=${users[2]!}`
    )[0],
  ).toEqual({ role: 'paralegal', revision: 2 });
  expect(
    (
      await sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action='staff.role.change.v1'`
    )[0]?.n,
  ).toBe(1);
  expect((await roleChange(2, 'billing', 1, 0, key)).status).toBe(409);
  expect((await roleChange(2, 'billing')).status).toBe(409);
  expect((await roleChange(2, 'attorney', 2)).status).toBe(200);
  expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(409);
});
it('checks live capabilities and same-firm membership, without trusting owner claims', async () => {
  for (const role of ['attorney', 'paralegal', 'billing', 'readonly']) {
    await sql`update firm_members set role=${role} where firm_id=${firm} and user_id=${users[2]!}`;
    expect((await staff('', 2)).status).toBe(403);
    expect((await staff('/history', 2)).status).toBe(403);
    expect((await roleChange(1, 'attorney', 1, 2)).status).toBe(403);
  }
  await sql`update firm_members set role='attorney' where firm_id=${firm} and user_id=${users[2]!}`;
  expect((await roleChange(4, 'attorney')).status).toBe(404);
  const foreignRead = await staff('', 4);
  expect(foreignRead.status).toBe(200);
  expect(JSON.stringify(await foreignRead.json())).not.toContain(users[0]!);
  for (const body of [
    { userId: users[2], role: 'attorney', expectedRevision: 3, reason: '' },
    { userId: users[2], role: 'attorney', expectedRevision: 3, reason: 'x', firmId: foreign },
  ])
    expect((await staff('/role-changes', 0, body)).status).toBe(422);
  expect((await staff('?afterId=invalid')).status).toBe(422);
});
it('requires current owner authority for owner roles and protects the last available owner', async () => {
  expect((await roleChange(0, 'admin', 1, 1)).status).toBe(403);
  expect((await roleChange(2, 'owner', 1, 1)).status).toBe(403);
  await sql`update auth.users set banned_until=now()+interval '1 hour' where id=${users[3]!}`;
  const denied = await roleChange(0, 'admin');
  expect(denied.status).toBe(409);
  expect(await denied.json()).toMatchObject({ code: 'LAST_FIRM_OWNER' });
  await sql`update auth.users set banned_until=null where id=${users[3]!}`;
});
it('requires an explicit authorized manager handoff before demotion without leaking a restricted matter', async () => {
  const response = await request('', 2, { title: 'Hidden employment advice' });
  expect(response.status).toBe(201);
  const id = createMatterResultSchema.parse(await response.json()).matter.id;
  const denied = await roleChange(2, 'readonly', 1);
  expect(denied.status).toBe(409);
  const text = await denied.text();
  expect(text).toContain('MATTER_HANDOFF_REQUIRED');
  expect(text).not.toContain(id);
  expect(text).not.toContain('Hidden employment advice');
  expect((await request(`/${id}`, 0)).status).toBe(404);
  expect((await changeGrant(id, users[1]!, 'manager', 1, 2)).status).toBe(200);
  expect((await roleChange(2, 'readonly', 1)).status).toBe(200);
  expect((await request(`/${id}/access`, 2)).status).toBe(403);
  expect((await request(`/${id}`, 2)).status).toBe(200);
});
it('revokes administrative authority for an existing session and denies its prior receipt replay', async () => {
  const key = randomUUID();
  expect((await roleChange(3, 'admin', 1, 1, key)).status).toBe(403);
  expect((await roleChange(2, 'billing', 1, 1, key)).status).toBe(200);
  expect((await roleChange(1, 'readonly')).status).toBe(200);
  expect((await staff('', 1)).status).toBe(403);
  expect((await roleChange(2, 'billing', 1, 1, key)).status).toBe(403);
  const context = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${await token(1)}` },
  });
  expect(context.status).toBe(200);
  expect(await context.json()).toMatchObject({
    role: 'readonly',
    capabilities: ['firm.profile.read'],
  });
});
it('prevents two competing owner demotions from leaving no owner', async () => {
  const result = await Promise.all([
    roleChange(0, 'attorney', 1, 0),
    roleChange(3, 'attorney', 1, 3),
  ]);
  expect(result.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(
    (
      await sql`select count(*)::int as n from firm_members where firm_id=${firm} and role='owner' and deleted_at is null`
    )[0]?.n,
  ).toBe(1);
});

it('rejects competing reviewed roles without overwriting history', async () => {
  const responses = await Promise.all([
    roleChange(2, 'paralegal', 1, 0),
    roleChange(2, 'billing', 1, 3),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(
    (await sql`select revision from firm_members where firm_id=${firm} and user_id=${users[2]!}`)[0]
      ?.revision,
  ).toBe(2);
  expect(
    (
      await sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action='staff.role.change.v1'`
    )[0]?.n,
  ).toBe(1);
});
it('serializes role demotion with a manager removal so an eligible manager remains', async () => {
  const created = await request('', 2, { title: 'Concurrent handoff' });
  expect(created.status).toBe(201);
  const id = createMatterResultSchema.parse(await created.json()).matter.id;
  expect((await changeGrant(id, users[1]!, 'manager', 1, 2)).status).toBe(200);
  const responses = await Promise.all([
    roleChange(2, 'readonly'),
    changeGrant(id, users[1]!, null, 2, 2),
  ]);
  const statuses = responses.map((r) => r.status);
  expect(statuses.filter((s) => s === 200)).toHaveLength(1);
  expect(statuses.every((s) => [200, 403, 409].includes(s))).toBe(true);
  expect(
    (
      await sql`select count(*)::int as n from matter_access a join firm_members fm on fm.firm_id=a.firm_id and fm.user_id=a.user_id where a.matter_id=${id} and a.deleted_at is null and a.role='manager' and fm.role in ('owner','admin','attorney') and fm.deleted_at is null`
    )[0]?.n,
  ).toBe(1);
});
it('revalidates actor session, recipient account and deleted memberships before receipt replay', async () => {
  const key = randomUUID();
  expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(200);
  await sql`update auth.users set banned_until=now()+interval '1 hour' where id=${users[2]!}`;
  expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(404);
  await sql`update auth.users set banned_until=null where id=${users[2]!}`;
  await sql`update auth.sessions set not_after=now()-interval '1 minute' where id=${sessions[0]!}`;
  expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(403);
  await sql`update auth.sessions set not_after=null where id=${sessions[0]!}`;
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[2]!}`;
  expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(404);
  await sql`update firm_members set deleted_at=null where firm_id=${firm} and user_id=${users[2]!}`;
  expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(200);
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[0]!}`;
  expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(403);
});
it('rolls back the role and receipt when audit insertion fails, then recovers the same intent once', async () => {
  const suffix = randomUUID().replaceAll('-', ''),
    name = `role_audit_${suffix}`,
    key = randomUUID();
  try {
    await sql
      .unsafe(
        `create function public.${name}() returns trigger language plpgsql as $$ begin if new.firm_id='${firm}'::uuid and new.action='staff.role.change.v1' then raise exception 'test-owned audit failure'; end if; return new; end $$; create trigger ${name} before insert on public.audit_logs for each row execute function public.${name}();`,
      )
      .simple();
    expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(500);
    expect(
      (
        await sql`select role,revision from firm_members where firm_id=${firm} and user_id=${users[2]!}`
      )[0],
    ).toEqual({ role: 'attorney', revision: 1 });
    expect(
      (
        await sql`select count(*)::int as n from command_receipts where firm_id=${firm} and idempotency_key=${key}`
      )[0]?.n,
    ).toBe(0);
  } finally {
    await sql
      .unsafe(
        `drop trigger if exists ${name} on public.audit_logs; drop function if exists public.${name}();`,
      )
      .simple();
  }
  expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(200);
  expect((await roleChange(2, 'paralegal', 1, 0, key)).status).toBe(200);
  expect(
    (
      await sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action='staff.role.change.v1'`
    )[0]?.n,
  ).toBe(1);
});
it('paginates current staff and microsecond history without foreign records, omissions or duplicates', async () => {
  for (let i = 0; i < 21; i++) {
    const user = randomUUID();
    extraUsers.push(user);
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@role.test`},now(),'{}'::jsonb)`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},'attorney')`;
  }
  const first = firmStaffListSchema.parse(await (await staff()).json());
  expect(first.items).toHaveLength(20);
  const second = firmStaffListSchema.parse(
    await (await staff(`?afterId=${first.nextCursor}`)).json(),
  );
  expect(second.items).toHaveLength(5);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.items, ...second.items].map((x) => x.userId)).size).toBe(25);
  for (let i = 0; i < 21; i++)
    expect(
      (
        await staff('/role-changes', 0, {
          userId: extraUsers[0],
          role: i % 2 === 0 ? 'paralegal' : 'attorney',
          expectedRevision: i + 1,
          reason: `Reviewed transition ${i}`,
        })
      ).status,
    ).toBe(200);
  const h1 = staffRoleHistorySchema.parse(await (await staff('/history')).json());
  expect(h1.items).toHaveLength(20);
  const h2 = staffRoleHistorySchema.parse(
    await (await staff(`/history?${new URLSearchParams(h1.nextCursor!)}`)).json(),
  );
  expect(h2.items).toHaveLength(1);
  expect(h2.nextCursor).toBeNull();
  expect([...h1.items, ...h2.items].map((x) => x.revision)).toEqual(
    Array.from({ length: 21 }, (_, i) => 22 - i),
  );
  expect(new Set([...h1.items, ...h2.items].map((x) => x.id)).size).toBe(21);
  expect((await staff(`/history?beforeId=${h1.nextCursor!.beforeId}`)).status).toBe(422);
});

it('publishes distinct staff and matter role contracts for generated consumers', () => {
  const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  const body = (path: string) =>
    doc.paths[path]!.post!.requestBody as { content: Record<string, { schema: { $ref: string } }> };
  const staffRef = body('/firms/current/staff/role-changes').content['application/json']!.schema
    .$ref;
  const matterRef = body('/matters/{matterId}/access-changes').content['application/json']!.schema
    .$ref;
  expect(staffRef).not.toBe(matterRef);
  const schema = doc.components!.schemas![staffRef.split('/').at(-1)!] as {
    properties: Record<string, { enum: string[] }>;
  };
  expect(schema.properties.role!.enum).toContain('owner');
  expect(schema.properties.role!.enum).not.toContain('reader');
});
