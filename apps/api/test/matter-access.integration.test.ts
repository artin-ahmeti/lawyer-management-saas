import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { z } from 'zod';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createMatterResultSchema } from '@lawfirm/core';
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
async function matter() {
  const response = await request('', 0, { title: 'Restricted advisory engagement' });
  expect(response.status).toBe(201);
  return createMatterResultSchema.parse(await response.json()).matter.id;
}
const change = (
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
async function revision(id: string, i = 0) {
  const response = await request(`/${id}/access`, i);
  expect(response.status).toBe(200);
  return z.object({ revision: z.number() }).parse(await response.json()).revision;
}
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
    await sql`insert into firm_members(firm_id,user_id,role) values (${i === 4 ? foreign : firm},${user},${i === 1 ? 'attorney' : i === 2 ? 'readonly' : 'owner'})`;
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
  for (const user of users) await sql`delete from auth.users where id=${user}`;
  await sql.end();
});
it('grants once under concurrent retries and commits policy, receipt and audit together', async () => {
  const id = await matter(),
    key = randomUUID();
  const responses = await Promise.all([
    change(id, users[1]!, 'reader', 1, 0, key),
    change(id, users[1]!, 'reader', 1, 0, key),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const first = await responses[0]!.json();
  expect(await responses[1]!.json()).toEqual(first);
  expect(first).toMatchObject({
    firmId: firm,
    matterId: id,
    userId: users[1],
    role: 'reader',
    revision: 2,
  });
  expect(await revision(id)).toBe(2);
  expect((await request(`/${id}`, 1)).status).toBe(200);
  expect(
    (
      await sql`select count(*)::int as n from audit_logs where record_id=${id} and action='matter.access.change.v1'`
    )[0]?.n,
  ).toBe(1);
  expect(
    (
      await sql`select count(*)::int as n from matter_access where matter_id=${id} and user_id=${users[1]!}`
    )[0]?.n,
  ).toBe(1);
  expect((await change(id, users[1]!, 'manager', 1, 0, key)).status).toBe(409);
});
it('requires both current staff capability and explicit manager grant without leaking rosters or history', async () => {
  const id = await matter();
  for (const i of [3, 4]) {
    for (const suffix of ['access', 'access-candidates', 'access-history'])
      expect((await request(`/${id}/${suffix}`, i)).status).toBe(404);
    expect((await change(id, users[1]!, 'reader', 1, i)).status).toBe(404);
  }
  expect((await change(id, users[1]!, 'reader', 1)).status).toBe(200);
  for (const suffix of ['access', 'access-candidates', 'access-history'])
    expect((await request(`/${id}/${suffix}`, 1)).status).toBe(403);
  expect((await change(id, users[2]!, 'reader', 2, 1)).status).toBe(403);
  await sql`update matter_access set role='manager' where matter_id=${id} and user_id=${users[1]!}`;
  await sql`update firm_members set role='readonly' where firm_id=${firm} and user_id=${users[1]!}`;
  expect((await change(id, users[2]!, 'reader', 2, 1)).status).toBe(403);
  await sql`update firm_members set role='attorney' where firm_id=${firm} and user_id=${users[1]!}`;
});
it('rejects authority fields, foreign/inactive recipients and manager grants to ineligible roles', async () => {
  const id = await matter();
  for (const input of [
    { userId: users[1], role: 'owner', expectedRevision: 1, reason: 'x' },
    { userId: users[1], role: 'reader', expectedRevision: 1, reason: '' },
    { userId: users[1], role: 'reader', expectedRevision: 1, reason: 'x', firmId: foreign },
  ])
    expect((await request(`/${id}/access-changes`, 0, input)).status).toBe(422);
  expect((await change(id, users[4]!, 'reader', 1)).status).toBe(404);
  expect((await change(id, users[2]!, 'manager', 1)).status).toBe(409);
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[1]!}`;
  expect((await change(id, users[1]!, 'reader', 1)).status).toBe(404);
  await sql`update firm_members set deleted_at=null where firm_id=${firm} and user_id=${users[1]!}`;
  expect(await revision(id)).toBe(1);
});
it('refuses loss of the last currently eligible manager, including when another manager is inactive', async () => {
  const id = await matter();
  expect((await change(id, users[0]!, null, 1)).status).toBe(409);
  expect((await change(id, users[0]!, 'reader', 1)).status).toBe(409);
  expect((await change(id, users[1]!, 'manager', 1)).status).toBe(200);
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[1]!}`;
  expect((await change(id, users[0]!, null, 2)).status).toBe(409);
  await sql`update firm_members set deleted_at=null where firm_id=${firm} and user_id=${users[1]!}`;
  expect((await change(id, users[0]!, null, 2)).status).toBe(200);
  expect((await request(`/${id}`)).status).toBe(404);
  expect((await request(`/${id}/access`, 1)).status).toBe(200);
});
it('serializes competing changes and refuses stale policy revisions without lost history', async () => {
  const id = await matter();
  expect((await change(id, users[1]!, 'manager', 1)).status).toBe(200);
  const responses = await Promise.all([
    change(id, users[2]!, 'reader', 2),
    change(id, users[3]!, 'reader', 2, 1),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(await revision(id)).toBe(3);
  expect(
    (
      await sql`select count(*)::int as n from audit_logs where record_id=${id} and action='matter.access.change.v1'`
    )[0]?.n,
  ).toBe(2);
});
it('revokes future API/RLS/count access and rejects receipt replay after a later policy change', async () => {
  const id = await matter(),
    key = randomUUID();
  expect((await change(id, users[1]!, 'reader', 1, 0, key)).status).toBe(200);
  expect((await change(id, users[1]!, null, 2)).status).toBe(200);
  expect((await request(`/${id}`, 1)).status).toBe(404);
  await sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: users[1], role: 'authenticated', firm_id: firm, session_id: sessions[1] })},true)`;
    expect((await tx`select count(*)::int as n from matters where id=${id}`)[0]?.n).toBe(0);
    expect(await tx`select id from matter_access where matter_id=${id}`).toEqual([]);
  });
  expect((await change(id, users[1]!, 'reader', 1, 0, key)).status).toBe(409);
  expect((await change(id, users[1]!, 'reader', 3)).status).toBe(200);
  expect(
    (
      await sql`select revision,deleted_at from matter_access where matter_id=${id} and user_id=${users[1]!}`
    )[0],
  ).toMatchObject({ revision: 3, deleted_at: null });
  const history = await request(`/${id}/access-history`);
  expect(history.status).toBe(200);
  expect(
    z.object({ items: z.array(z.object({ reason: z.string() })) }).parse(await history.json())
      .items,
  ).toHaveLength(3);
});
it('revalidates actor revocation and current recipient status on retry and excludes foreign candidates', async () => {
  const id = await matter(),
    key = randomUUID();
  expect((await change(id, users[1]!, 'manager', 1, 0, key)).status).toBe(200);
  expect((await change(id, users[0]!, null, 2, 1)).status).toBe(200);
  expect((await change(id, users[1]!, 'manager', 1, 0, key)).status).toBe(404);
  const candidates = z
    .object({ items: z.array(z.object({ userId: z.string() })) })
    .parse(await (await request(`/${id}/access-candidates`, 1)).json());
  expect(candidates.items.map((x) => x.userId)).not.toContain(users[4]);
  expect((await request(`/${id}/access-candidates?afterId=bad`, 1)).status).toBe(422);
});
it('rechecks recipient account/role and actor session on a lost-response retry', async () => {
  const id = await matter(),
    key = randomUUID();
  expect((await change(id, users[1]!, 'manager', 1, 0, key)).status).toBe(200);
  await sql`update auth.users set banned_until=now()+interval '1 hour' where id=${users[1]!}`;
  expect((await change(id, users[1]!, 'manager', 1, 0, key)).status).toBe(404);
  await sql`update auth.users set banned_until=null where id=${users[1]!}`;
  await sql`update firm_members set role='readonly' where firm_id=${firm} and user_id=${users[1]!}`;
  expect((await change(id, users[1]!, 'manager', 1, 0, key)).status).toBe(409);
  await sql`update firm_members set role='attorney' where firm_id=${firm} and user_id=${users[1]!}`;
  await sql`update auth.sessions set not_after=now()-interval '1 minute' where id=${sessions[0]!}`;
  expect((await change(id, users[1]!, 'manager', 1, 0, key)).status).toBe(403);
  await sql`update auth.sessions set not_after=null where id=${sessions[0]!}`;
  expect((await change(id, users[1]!, 'manager', 1, 0, key)).status).toBe(200);
});
it('cannot remove both managers in competing reviewed requests', async () => {
  const id = await matter();
  expect((await change(id, users[1]!, 'manager', 1)).status).toBe(200);
  const responses = await Promise.all([
    change(id, users[1]!, null, 2),
    change(id, users[0]!, null, 2, 1),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([200, 404]);
  expect(
    (
      await sql`select count(*)::int as n from matter_access where matter_id=${id} and role='manager' and deleted_at is null`
    )[0]?.n,
  ).toBe(1);
});
it('paginates assignments, current same-firm candidates and exact timestamp history without omissions', async () => {
  const id = await matter();
  for (let i = 0; i < 21; i++) {
    const user = randomUUID();
    users.push(user);
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@paging.access.test`},now(),'{}'::jsonb)`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},'readonly')`;
    expect((await change(id, user, 'reader', i + 1)).status).toBe(200);
  }
  const page = z.object({
    items: z.array(z.object({ userId: z.string() })),
    nextCursor: z.string().nullable(),
  });
  for (const surface of ['access', 'access-candidates']) {
    const first = page.parse(await (await request(`/${id}/${surface}`)).json());
    const second = page.parse(
      await (await request(`/${id}/${surface}?afterId=${first.nextCursor}`)).json(),
    );
    expect(first.items).toHaveLength(20);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map((x) => x.userId)).size).toBe(
      surface === 'access' ? 22 : 25,
    );
  }
  const historyPage = z.object({
    items: z.array(z.object({ id: z.string(), revision: z.number() })),
    nextCursor: z.object({ beforeId: z.string(), beforeCreatedAt: z.string() }).nullable(),
  });
  const first = historyPage.parse(await (await request(`/${id}/access-history`)).json());
  expect(first.items).toHaveLength(20);
  expect(first.nextCursor).toBeTruthy();
  const second = historyPage.parse(
    await (await request(`/${id}/access-history?${new URLSearchParams(first.nextCursor!)}`)).json(),
  );
  expect(second.items).toHaveLength(1);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.items, ...second.items].map((x) => x.id)).size).toBe(21);
  expect([...first.items, ...second.items].map((x) => x.revision)).toEqual(
    Array.from({ length: 21 }, (_, i) => 22 - i),
  );
  expect((await request(`/${id}/access-history?beforeId=${randomUUID()}`)).status).toBe(422);
});
it('enforces the current access-management capability for every staff role', async () => {
  const id = await matter();
  let rev = 1;
  for (const role of ['owner', 'admin', 'attorney', 'paralegal', 'billing', 'readonly']) {
    await sql`update firm_members set role=${role} where firm_id=${firm} and user_id=${users[0]!}`;
    const eligible = ['owner', 'admin', 'attorney'].includes(role);
    expect((await request(`/${id}/access`)).status).toBe(eligible ? 200 : 403);
    expect((await change(id, users[1]!, rev % 2 === 1 ? 'reader' : 'manager', rev)).status).toBe(
      eligible ? 200 : 403,
    );
    if (eligible) rev++;
  }
  await sql`update firm_members set role='owner' where firm_id=${firm} and user_id=${users[0]!}`;
  expect(await revision(id)).toBe(4);
});
it('rolls back grant, policy and receipt if the required audit cannot commit, then safely retries', async () => {
  const id = await matter(),
    key = randomUUID(),
    name = `reject_access_audit_${randomUUID().replaceAll('-', '')}`;
  // This test-owned trigger rejects only this fixture firm's command; always removed below.
  await sql
    .unsafe(
      `create function public.${name}() returns trigger language plpgsql as $$ begin
    if new.firm_id='${firm}'::uuid and new.action='matter.access.change.v1' then
      raise exception 'Test audit failure';
    end if; return new; end; $$;
    create trigger ${name} before insert on public.audit_logs for each row execute function public.${name}();`,
    )
    .simple();
  try {
    expect((await change(id, users[1]!, 'reader', 1, 0, key)).status).toBe(500);
    expect(await revision(id)).toBe(1);
    expect(
      await sql`select id from matter_access where matter_id=${id} and user_id=${users[1]!}`,
    ).toEqual([]);
    expect(
      await sql`select id from command_receipts where firm_id=${firm} and idempotency_key=${key}`,
    ).toEqual([]);
  } finally {
    await sql`drop trigger ${sql(name)} on public.audit_logs`;
    await sql`drop function public.${sql(name)}()`;
  }
  expect((await change(id, users[1]!, 'reader', 1, 0, key)).status).toBe(200);
  expect(await revision(id)).toBe(2);
});
