import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';
import { staffMembershipListSchema } from '@lawfirm/core';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Local database required');
const sql = postgres(url, { max: 2 });
const actor = randomUUID(),
  stranger = randomUUID(),
  emptyActor = randomUUID();
const ownedFirms = Array.from({ length: 23 }, () => randomUUID());
const privateFirm = randomUUID();
let app: INestApplication, base: string;
let memberships: { id: string; firmId: string; firmName: string; role: string }[];
async function token(userId = actor) {
  return new SignJWT({ role: 'authenticated', firm_id: privateFirm, user_role: 'owner' })
    .setSubject(userId)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
}
async function read(query = '', userId = actor) {
  return fetch(`${base}/auth/memberships${query}`, {
    headers: { Authorization: `Bearer ${await token(userId)}` },
  });
}
beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const user of [actor, stranger, emptyActor])
    await sql`insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
      values (${user}, ${`${user}@memberships.test`}, now(), '{}'::jsonb)`;
  for (const [i, firm] of ownedFirms.entries()) {
    await sql`insert into firms (id, name) values (${firm}, ${`Workspace ${i}`})`;
    await sql`insert into firm_members (firm_id, user_id, role) values (${firm}, ${actor}, 'readonly')`;
  }
  await sql`insert into firms (id, name) values (${privateFirm}, 'Unrelated private firm')`;
  await sql`insert into firm_members (firm_id, user_id, role) values (${privateFirm}, ${stranger}, 'owner')`;
  memberships = await sql<
    typeof memberships
  >`select fm.id, fm.firm_id as "firmId", f.name as "firmName", fm.role
    from firm_members fm join firms f on f.id = fm.firm_id where fm.user_id = ${actor} order by fm.id`;
  app = await NestFactory.create(AppModule, { logger: false });
  app.get(ConfigService).set('SUPABASE_URL', 'http://127.0.0.1:54321');
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  await sql`delete from firm_members where user_id in (${actor}, ${stranger}, ${emptyActor})`;
  for (const firm of [...ownedFirms, privateFirm]) await sql`delete from firms where id = ${firm}`;
  await sql`delete from auth.users where id in (${actor}, ${stranger}, ${emptyActor})`;
  await sql.end();
});
it('lists only live memberships owned by the confirmed actor, despite a forged firm and owner claim', async () => {
  const response = await read();
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({
    userId: actor,
    items: memberships.slice(0, 20),
    nextCursor: { afterId: memberships[19]!.id },
  });
});
it('continues a bounded stable page without duplicates or other staff details', async () => {
  const response = await read(`?afterId=${memberships[19]!.id}`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    userId: actor,
    items: memberships.slice(20),
    nextCursor: null,
  });
});
it('returns an empty account-level read without requiring a firm grant', async () => {
  const response = await read('', emptyActor);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ userId: emptyActor, items: [], nextCursor: null });
});
it('removes revoked memberships and deleted firms, and reflects the current role', async () => {
  const [first, second, third] = memberships;
  await sql`update firm_members set deleted_at = now() where id = ${first!.id}`;
  await sql`update firms set deleted_at = now() where id = ${second!.firmId}`;
  await sql`update firm_members set role = 'paralegal' where id = ${third!.id}`;
  try {
    const response = await read();
    expect(response.status).toBe(200);
    const body = staffMembershipListSchema.parse(await response.json());
    expect(body.items).toEqual([{ ...third!, role: 'paralegal' }, ...memberships.slice(3, 22)]);
    expect(JSON.stringify(body)).not.toContain(first!.firmId);
    expect(JSON.stringify(body)).not.toContain(second!.firmId);
  } finally {
    await sql`update firm_members set deleted_at = null, role = 'readonly' where user_id = ${actor}`;
    await sql`update firms set deleted_at = null where id = ${second!.firmId}`;
  }
});
it('denies stale tokens for banned, deleted or unconfirmed accounts and nonexistent actors', async () => {
  for (const change of [
    sql`banned_until = now() + interval '1 hour'`,
    sql`deleted_at = now()`,
    sql`email_confirmed_at = null`,
  ]) {
    await sql`update auth.users set ${change} where id = ${actor}`;
    try {
      const response = await read();
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).not.toHaveProperty('items');
      expect(JSON.stringify(body)).not.toContain('Workspace');
    } finally {
      await sql`update auth.users set banned_until = null, deleted_at = null, email_confirmed_at = now() where id = ${actor}`;
    }
  }
  expect((await read('', randomUUID())).status).toBe(403);
});
it('rejects unbounded and actor/firm-controlled queries rather than changing the authorization scope', async () => {
  for (const query of [
    `?userId=${stranger}`,
    `?firmId=${privateFirm}`,
    '?limit=100000',
    '?afterId=invalid',
  ])
    expect((await read(query)).status).toBe(422);
});
it('requires an authenticated request', async () => {
  expect((await fetch(`${base}/auth/memberships`)).status).toBe(401);
});
