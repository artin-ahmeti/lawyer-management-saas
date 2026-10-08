import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';
import { createMatterResultSchema, matterListSchema } from '@lawfirm/core';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local DB required');
const sql = postgres(url, { max: 3 });
const firm = randomUUID(),
  otherFirm = randomUUID();
const users = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const sessions = users.map(() => randomUUID());
let app: INestApplication, base: string;
let saved: string;
let createKey: string;
async function token(index = 0, activeFirm: string = firm) {
  return new SignJWT({
    role: 'authenticated',
    firm_id: activeFirm,
    user_role: 'owner',
    session_id: sessions[index],
  })
    .setSubject(users[index]!)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
}
async function request(
  path = '',
  index = 0,
  input?: unknown,
  key: string = randomUUID(),
  activeFirm: string = firm,
) {
  return fetch(`${base}/matters${path}`, {
    method: input ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${await token(index, activeFirm)}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
}
beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const [i, user] of users.entries()) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@matter.test`},now(),'{}'::jsonb)`;
    await sql`insert into auth.sessions(id,user_id) values (${sessions[i]!},${user})`;
  }
  await sql`insert into firms(id,name) values (${firm},'Matter test firm'),(${otherFirm},'Other matter firm')`;
  for (const [i, user] of users.entries())
    await sql`insert into firm_members(firm_id,user_id,role) values (${i === 3 ? otherFirm : firm},${user},${i === 2 ? 'readonly' : 'owner'})`;
  app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  const [exists] = await sql`select to_regclass('public.matters') is not null as present`;
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role=replica`;
    await tx`delete from audit_logs where firm_id in (${firm},${otherFirm})`;
    await tx`delete from command_receipts where firm_id in (${firm},${otherFirm})`;
    if (exists?.present) {
      await tx`delete from matter_access where firm_id in (${firm},${otherFirm})`;
      await tx`delete from matters where firm_id in (${firm},${otherFirm})`;
    }
  });
  await sql`delete from firm_members where firm_id in (${firm},${otherFirm})`;
  await sql`delete from firms where id in (${firm},${otherFirm})`;
  for (const user of users) await sql`delete from auth.users where id=${user}`;
  await sql.end();
});
it('creates one non-court matter, creator grant and audit under concurrent identical requests', async () => {
  createKey = randomUUID();
  const input = { title: '  Advisory engagement  ', reference: 'ADV-1' };
  const responses = await Promise.all([
    request('', 0, input, createKey),
    request('', 0, input, createKey),
  ]);
  expect(responses.map((r) => r.status)).toEqual([201, 201]);
  const first = createMatterResultSchema.parse(await responses[0]!.json()),
    replay = await responses[1]!.json();
  expect(replay).toEqual(first);
  saved = first.matter.id;
  expect(first.matter).toMatchObject({
    firmId: firm,
    title: 'Advisory engagement',
    reference: 'ADV-1',
    accessRole: 'manager',
  });
  expect((await sql`select count(*)::int as n from matters where firm_id=${firm}`)[0]?.n).toBe(1);
  expect(
    (
      await sql`select count(*)::int as n from matter_access where matter_id=${saved} and user_id=${users[0]!}`
    )[0]?.n,
  ).toBe(1);
  expect(
    (
      await sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action='matter.create.v1'`
    )[0]?.n,
  ).toBe(1);
});
it('hides an ungranted matter even from a same-firm owner and a cross-firm owner', async () => {
  expect((await request(`/${saved}`, 1)).status).toBe(404);
  const ownList = await request('', 1);
  expect(ownList.status).toBe(200);
  expect(matterListSchema.parse(await ownList.json()).items).toEqual([]);
  expect((await request(`/${saved}`, 3, undefined, randomUUID(), otherFirm)).status).toBe(404);
  expect((await request(`/${saved}`, 3)).status).toBe(403);
  expect((await request(`/${randomUUID()}`, 1)).status).toBe(404);
});
it('uses live staff roles, validates authority fields and prevents changed-payload key reuse', async () => {
  expect((await request('', 2, { title: 'Denied' })).status).toBe(403);
  for (const input of [
    { title: '' },
    { title: 'x', firmId: otherFirm },
    { title: 'x', createdBy: users[1] },
    { title: 'x', accessRole: 'manager' },
  ])
    expect((await request('', 0, input)).status).toBe(422);
  expect((await request('', 0, { title: 'Another intent' }, createKey)).status).toBe(409);
  expect((await sql`select count(*)::int as n from matters where firm_id=${firm}`)[0]?.n).toBe(1);
});
it('revalidates grants, membership, matter removal and replay access', async () => {
  await sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values (${firm},${saved},${users[2]!},'reader',${users[0]!})`;
  expect((await request(`/${saved}`, 2)).status).toBe(200);
  await sql`update matter_access set deleted_at=now() where matter_id=${saved} and user_id=${users[2]!}`;
  expect((await request(`/${saved}`, 2)).status).toBe(404);
  expect(matterListSchema.parse(await (await request('', 2)).json()).items).toEqual([]);
  await sql`update matter_access set deleted_at=now() where matter_id=${saved} and user_id=${users[0]!}`;
  expect(
    (await request('', 0, { title: '  Advisory engagement  ', reference: 'ADV-1' }, createKey))
      .status,
  ).toBe(404);
  await sql`update matter_access set deleted_at=null where matter_id=${saved} and user_id=${users[0]!}`;
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[0]!}`;
  expect((await request(`/${saved}`)).status).toBe(403);
  await sql`update firm_members set deleted_at=null where firm_id=${firm} and user_id=${users[0]!}`;
  await sql`update matters set deleted_at=now() where id=${saved}`;
  expect((await request(`/${saved}`)).status).toBe(404);
  await sql`update matters set deleted_at=null where id=${saved}`;
});
it('enforces ethical walls and the API write rule for authenticated SQL reads', async () => {
  async function read(index: number) {
    return sql.begin(async (tx) => {
      await tx`set local role authenticated`;
      await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: users[index], role: 'authenticated', firm_id: firm, session_id: sessions[index] })},true)`;
      return tx`select id from matters where id=${saved}`;
    });
  }
  expect(await read(0)).toEqual([{ id: saved }]);
  expect(await read(1)).toEqual([]);
  await expect(
    sql.begin(async (tx) => {
      await tx`set local role authenticated`;
      await tx`insert into matters(firm_id,title,created_by) values (${firm},'Illegal',${users[0]!})`;
    }),
  ).rejects.toMatchObject({ code: '42501' });
  await expect(
    sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values (${otherFirm},${saved},${users[3]!},'reader',${users[3]!})`,
  ).rejects.toMatchObject({ code: '23503' });
});
it('paginates only currently accessible records with stable cursors', async () => {
  for (let i = 0; i < 21; i++)
    expect((await request('', 0, { title: `Transaction ${i}` })).status).toBe(201);
  const first = matterListSchema.parse(await (await request()).json());
  expect(first.items).toHaveLength(20);
  expect(first.nextCursor).toBeTruthy();
  const second = matterListSchema.parse(
    await (await request(`?afterId=${first.nextCursor}`)).json(),
  );
  expect(second.items).toHaveLength(2);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.items, ...second.items].map((m) => m.id)).size).toBe(22);
  expect((await request('?afterId=invalid')).status).toBe(422);
});
it('enforces the initial creation capability for every live staff role and rejects expired sessions', async () => {
  expect((await fetch(`${base}/matters`)).status).toBe(401);
  for (const role of ['owner', 'admin', 'attorney', 'paralegal', 'billing', 'readonly']) {
    await sql`update firm_members set role=${role} where firm_id=${firm} and user_id=${users[2]!}`;
    expect((await request('', 2, { title: `Role test ${role}` })).status).toBe(
      ['owner', 'admin', 'attorney'].includes(role) ? 201 : 403,
    );
  }
  await sql`update auth.sessions set not_after=now()-interval '1 minute' where id=${sessions[0]!}`;
  expect((await request(`/${saved}`)).status).toBe(403);
  expect((await request('', 0, { title: 'Expired session' })).status).toBe(403);
  await sql`update auth.sessions set not_after=null where id=${sessions[0]!}`;
});
