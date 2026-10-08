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

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw new Error('Local database required');
const sql = postgres(url, { max: 2 });
const user = randomUUID();
const firm = randomUUID();
const other = randomUUID();
let app: INestApplication;
let base: string;
async function token(activeFirm: string | null = firm) {
  return new SignJWT({
    role: 'authenticated',
    ...(activeFirm ? { firm_id: activeFirm } : {}),
    user_role: 'owner',
  })
    .setSubject(user)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
}
async function read(activeFirm: string | null = firm) {
  return fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${await token(activeFirm)}` },
  });
}
beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  await sql`insert into auth.users (id, email, raw_user_meta_data) values (${user}, ${`${user}@access.test`}, '{}'::jsonb)`;
  await sql`insert into firms (id, name) values (${firm}, 'Access LLP'), (${other}, 'Private firm')`;
  await sql`insert into firm_members (firm_id, user_id, role) values (${firm}, ${user}, 'owner')`;
  app = await NestFactory.create(AppModule, { logger: false });
  app.get(ConfigService).set('SUPABASE_URL', 'http://127.0.0.1:54321');
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  await sql`delete from firm_members where firm_id = ${firm}`;
  await sql`delete from firms where id in (${firm}, ${other})`;
  await sql`delete from auth.users where id = ${user}`;
  await sql.end();
});
it('returns supported firm capabilities from the current database role instead of a claimed owner role', async () => {
  for (const role of ['owner', 'admin', 'attorney', 'paralegal', 'billing', 'readonly']) {
    await sql`update firm_members set role = ${role} where firm_id = ${firm} and user_id = ${user}`;
    const response = await read();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({
      userId: user,
      firmId: firm,
      role,
      capabilities: [
        'firm.profile.read',
        ...(['owner', 'admin'].includes(role)
          ? [
              'firm.profile.rename',
              'firm.processing.inspect',
              'firm.processing.request',
              'firm.staff.invitations.manage',
              'firm.staff.roles.manage',
            ]
          : []),
      ],
    });
  }
});
it('does not assign a firm or owner authority to an identity without active-firm context', async () => {
  const response = await read(null);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ userId: user, capabilities: [] });
});
it('denies cross-firm and revoked memberships and removed firms even with an old owner token', async () => {
  expect((await read(other)).status).toBe(403);
  await sql`update firm_members set deleted_at = now() where firm_id = ${firm} and user_id = ${user}`;
  expect((await read()).status).toBe(403);
  await sql`update firm_members set deleted_at = null where firm_id = ${firm} and user_id = ${user}`;
  await sql`update firms set deleted_at = now() where id = ${firm}`;
  expect((await read()).status).toBe(403);
});
