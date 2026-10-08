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
  matterAccessHistorySchema,
  removedStaffListSchema,
  staffMembershipHistorySchema,
} from '@lawfirm/core';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local DB required');
const sql = postgres(url, { max: 4 });
const firm = randomUUID(),
  foreign = randomUUID();
// 0 owner, 1 admin, 2 attorney, 3 owner, 4 owner of a foreign firm
const users = Array.from({ length: 5 }, () => randomUUID());
const sessions = users.map(() => randomUUID());
const roles = ['owner', 'admin', 'attorney', 'owner', 'owner'];
const extraUsers: string[] = [];
let app: INestApplication, base: string;
async function token(i = 0) {
  return new SignJWT({
    role: 'authenticated',
    firm_id: i === 4 ? foreign : firm,
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
async function call(path: string, i = 0, input?: unknown, key: string = randomUUID()) {
  return fetch(`${base}${path}`, {
    method: input ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${await token(i)}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
}
const remove = (i: number, revision = 1, actor = 0, key = randomUUID(), reason = 'Left the firm') =>
  call(
    '/firms/current/staff/removals',
    actor,
    { userId: users[i], expectedRevision: revision, reason },
    key,
  );
const restore = (i: number, role: string, revision: number, actor = 0, key = randomUUID()) =>
  call(
    '/firms/current/staff/restorations',
    actor,
    { userId: users[i], role, expectedRevision: revision, reason: 'Rejoined the firm' },
    key,
  );
const createMatter = async (title: string, i = 2) => {
  const response = await call('/matters', i, { title });
  expect(response.status).toBe(201);
  return createMatterResultSchema.parse(await response.json()).matter.id;
};
const grant = (id: string, userId: string, role: 'reader' | 'manager' | null, rev: number, i = 2) =>
  call(`/matters/${id}/access-changes`, i, {
    userId,
    role,
    expectedRevision: rev,
    reason: 'Assignment reviewed',
  });
const count = async (query: postgres.PendingQuery<postgres.Row[]>) => (await query)[0]?.n as number;
const membership = async (i: number) =>
  (
    await sql`select role,revision,deleted_at is not null as removed from firm_members where firm_id=${firm} and user_id=${users[i]!}`
  )[0];

beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const [i, user] of users.entries()) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@membership.test`},now(),'{}'::jsonb)`;
    await sql`insert into auth.sessions(id,user_id) values (${sessions[i]!},${user})`;
  }
  await sql`insert into firms(id,name) values (${firm},'Membership test firm'),(${foreign},'Foreign membership firm')`;
  for (const [i, user] of users.entries())
    await sql`insert into firm_members(firm_id,user_id,role) values (${i === 4 ? foreign : firm},${user},${roles[i]!})`;
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
    await tx`delete from staff_invitations where firm_id in (${firm},${foreign})`;
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
    await tx`delete from staff_invitations where firm_id=${firm}`;
    await tx`delete from matter_access where firm_id=${firm}`;
    await tx`delete from matters where firm_id=${firm}`;
  });
  for (const [i, user] of users.entries()) {
    await sql`update auth.users set banned_until=null,deleted_at=null,email_confirmed_at=now() where id=${user}`;
    await sql`update auth.sessions set not_after=null where id=${sessions[i]!}`;
    await sql`update firm_members set role=${roles[i]!},revision=1,deleted_at=null where user_id=${user}`;
  }
});

it('removes and restores a membership once under concurrent replay and rejects changed intent or stale review', async () => {
  const key = randomUUID();
  const responses = await Promise.all([remove(2, 1, 0, key), remove(2, 1, 0, key)]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  const result = await responses[0]!.json();
  expect(await responses[1]!.json()).toEqual(result);
  expect(result).toMatchObject({
    firmId: firm,
    userId: users[2],
    role: 'attorney',
    revision: 2,
    status: 'removed',
  });
  expect(await membership(2)).toEqual({ role: 'attorney', revision: 2, removed: true });
  expect(
    await count(
      sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action='staff.membership.remove.v1'`,
    ),
  ).toBe(1);
  expect((await remove(2, 1, 0, key, 'Another reason')).status).toBe(409);
  const again = await remove(2, 2);
  expect(again.status).toBe(409);
  expect(await again.json()).toMatchObject({ code: 'STAFF_MEMBERSHIP_UNCHANGED' });
  expect((await restore(2, 'paralegal', 1)).status).toBe(409);
  const restored = await restore(2, 'paralegal', 2);
  expect(restored.status).toBe(200);
  expect(await restored.json()).toMatchObject({ role: 'paralegal', revision: 3, status: 'active' });
  expect(await membership(2)).toEqual({ role: 'paralegal', revision: 3, removed: false });
  expect((await remove(2, 1, 0, key)).status).toBe(409);
  expect((await restore(2, 'attorney', 3)).status).toBe(409);
});

it('checks live capabilities and same-firm targets without trusting owner claims', async () => {
  await sql`update firm_members set deleted_at=now(),revision=2 where firm_id=${firm} and user_id=${users[3]!}`;
  for (const role of ['attorney', 'paralegal', 'billing', 'readonly']) {
    await sql`update firm_members set role=${role} where firm_id=${firm} and user_id=${users[2]!}`;
    expect((await call('/firms/current/staff/removed', 2)).status).toBe(403);
    expect((await call('/firms/current/staff/membership-history', 2)).status).toBe(403);
    expect((await remove(1, 1, 2)).status).toBe(403);
    expect((await restore(3, 'attorney', 2, 2)).status).toBe(403);
  }
  expect((await remove(4)).status).toBe(404);
  expect((await restore(4, 'attorney', 1)).status).toBe(404);
  const foreignRead = await call('/firms/current/staff/removed', 4);
  expect(foreignRead.status).toBe(200);
  expect(JSON.stringify(await foreignRead.json())).not.toContain(users[3]!);
  for (const [path, body] of [
    ['removals', { userId: users[2], expectedRevision: 1, reason: '' }],
    ['removals', { userId: users[2], expectedRevision: 1, reason: 'x', firmId: foreign }],
    ['restorations', { userId: users[3], expectedRevision: 2, reason: 'x' }],
    ['restorations', { userId: users[3], role: 'reader', expectedRevision: 2, reason: 'x' }],
  ] as const)
    expect((await call(`/firms/current/staff/${path}`, 0, body)).status).toBe(422);
  expect((await call('/firms/current/staff/removed?afterId=invalid')).status).toBe(422);
});

it('requires current owner authority for owner targets and protects the last available owner', async () => {
  const denied = await remove(0, 1, 1);
  expect(denied.status).toBe(403);
  expect(await denied.json()).toMatchObject({ code: 'OWNER_REQUIRED' });
  expect((await remove(3)).status).toBe(200);
  expect((await restore(3, 'owner', 2, 1)).status).toBe(403);
  expect((await restore(3, 'attorney', 2, 1)).status).toBe(200);
  await sql`update firm_members set role='owner' where firm_id=${firm} and user_id=${users[3]!}`;
  await sql`update auth.users set banned_until=now()+interval '1 hour' where id=${users[3]!}`;
  const last = await remove(0, 1, 0);
  expect(last.status).toBe(409);
  expect(await last.json()).toMatchObject({ code: 'LAST_FIRM_OWNER' });
  expect((await membership(0))?.removed).toBe(false);
});

it('refuses to strand a restricted matter without disclosing it, then revokes grants on removal', async () => {
  const id = await createMatter('Confidential merger advice');
  const denied = await remove(2);
  expect(denied.status).toBe(409);
  const text = await denied.text();
  expect(text).toContain('MATTER_HANDOFF_REQUIRED');
  expect(text).not.toContain(id);
  expect(text).not.toContain('Confidential merger advice');
  expect((await grant(id, users[1]!, 'manager', 1)).status).toBe(200);
  const removed = await remove(2, 1, 0, randomUUID(), 'Private personnel detail');
  expect(removed.status).toBe(200);
  const body = await removed.text();
  expect(body).not.toContain(id);
  expect(
    (
      await sql`select role,revision,deleted_at is not null as revoked from matter_access where matter_id=${id} and user_id=${users[2]!}`
    )[0],
  ).toEqual({ role: 'manager', revision: 2, revoked: true });
  expect((await sql`select access_revision from matters where id=${id}`)[0]?.access_revision).toBe(
    3,
  );
  const history = matterAccessHistorySchema.parse(
    await (await call(`/matters/${id}/access-history`, 1)).json(),
  );
  expect(history.items[0]).toMatchObject({
    userId: users[2],
    previousRole: 'manager',
    role: null,
    revision: 3,
    reason: 'Staff membership removed.',
  });
  expect(JSON.stringify(history)).not.toContain('Private personnel detail');
});

it('ends a removed member’s API and database access and keeps grants revoked after restoration', async () => {
  const id = await createMatter('Walled litigation');
  expect((await grant(id, users[1]!, 'manager', 1)).status).toBe(200);
  expect((await remove(2)).status).toBe(200);
  expect((await call(`/matters/${id}`, 2)).status).toBe(403);
  expect((await call('/matters', 2)).status).toBe(403);
  const rls = async () =>
    sql.begin(async (tx) => {
      await tx`set local role authenticated`;
      await tx`select set_config('request.jwt.claims',${JSON.stringify({ sub: users[2], role: 'authenticated', firm_id: firm, session_id: sessions[2] })},true)`;
      return {
        matters: await count(tx`select count(*)::int as n from matters where id=${id}`),
        grants: await count(tx`select count(*)::int as n from matter_access where matter_id=${id}`),
      };
    });
  expect(await rls()).toEqual({ matters: 0, grants: 0 });
  expect((await restore(2, 'attorney', 2)).status).toBe(200);
  expect((await call(`/matters/${id}`, 2)).status).toBe(404);
  expect(await rls()).toEqual({ matters: 0, grants: 0 });
  expect(
    await count(
      sql`select count(*)::int as n from matter_access where firm_id=${firm} and user_id=${users[2]!} and deleted_at is null`,
    ),
  ).toBe(0);
});

it('revokes grants left active by a membership removed outside the command when restoring it', async () => {
  const id = await createMatter('Legacy removal');
  expect((await grant(id, users[1]!, 'manager', 1)).status).toBe(200);
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[2]!}`;
  expect((await restore(2, 'attorney', 1)).status).toBe(200);
  expect((await call(`/matters/${id}`, 2)).status).toBe(404);
  const history = matterAccessHistorySchema.parse(
    await (await call(`/matters/${id}/access-history`, 1)).json(),
  );
  expect(history.items[0]).toMatchObject({ userId: users[2], role: null });
});

it('removes an unavailable sole manager, whose grant could otherwise return if the ban lifts', async () => {
  const id = await createMatter('Unreachable manager');
  await sql`update auth.users set banned_until=now()+interval '1 hour' where id=${users[2]!}`;
  expect((await remove(2)).status).toBe(200);
  expect(
    await count(
      sql`select count(*)::int as n from matter_access where matter_id=${id} and deleted_at is null`,
    ),
  ).toBe(0);
});

it('lists a removed account whose Auth email is missing', async () => {
  expect((await remove(2)).status).toBe(200);
  await sql`update auth.users set email=null where id=${users[2]!}`;
  try {
    const response = await call('/firms/current/staff/removed');
    expect(response.status).toBe(200);
    expect(removedStaffListSchema.parse(await response.json()).items).toEqual([
      expect.objectContaining({ userId: users[2], email: null }),
    ]);
  } finally {
    await sql`update auth.users set email=${`${users[2]}@membership.test`} where id=${users[2]!}`;
  }
});

it('distinguishes a restoration that revokes leftover grants in matter history', async () => {
  const id = await createMatter('Leftover grant');
  expect((await grant(id, users[1]!, 'manager', 1)).status).toBe(200);
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[2]!}`;
  expect((await restore(2, 'attorney', 1)).status).toBe(200);
  const history = matterAccessHistorySchema.parse(
    await (await call(`/matters/${id}/access-history`, 1)).json(),
  );
  expect(history.items[0]?.reason).toBe('Staff membership restored without matter access.');
});

it('keeps a removed member out through invitations, which require a membership review', async () => {
  expect((await remove(2)).status).toBe(200);
  const invited = await call('/firms/current/staff-invitations', 0, {
    email: `${users[2]}@membership.test`,
    role: 'attorney',
  });
  expect(invited.status).toBe(409);
});

it('commits self-removal once without authorizing replay or further administration', async () => {
  const key = randomUUID();
  expect((await remove(1, 1, 1, key)).status).toBe(200);
  expect((await remove(1, 1, 1, key)).status).toBe(403);
  expect((await call('/firms/current/staff', 1)).status).toBe(403);
  expect((await call('/firms/current/staff/removed', 1)).status).toBe(403);
});

it('revalidates actor session and recipient state before receipt replay', async () => {
  const key = randomUUID();
  expect((await remove(2, 1, 0, key)).status).toBe(200);
  await sql`update auth.sessions set not_after=now()-interval '1 minute' where id=${sessions[0]!}`;
  expect((await remove(2, 1, 0, key)).status).toBe(403);
  await sql`update auth.sessions set not_after=null where id=${sessions[0]!}`;
  await sql`update firm_members set deleted_at=null where firm_id=${firm} and user_id=${users[2]!}`;
  expect((await remove(2, 1, 0, key)).status).toBe(409);
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[2]!}`;
  expect((await remove(2, 1, 0, key)).status).toBe(200);
  await sql`update auth.users set banned_until=now()+interval '1 hour' where id=${users[2]!}`;
  const unavailable = await restore(2, 'attorney', 2);
  expect(unavailable.status).toBe(404);
  expect(await unavailable.json()).toMatchObject({ code: 'STAFF_UNAVAILABLE' });
});

it('prevents competing owner removals from leaving no owner', async () => {
  const responses = await Promise.all([remove(3, 1, 0), remove(0, 1, 3)]);
  const statuses = responses.map((r) => r.status).sort();
  expect(statuses[0]).toBe(200);
  expect([403, 409]).toContain(statuses[1]);
  expect(
    await count(
      sql`select count(*)::int as n from firm_members where firm_id=${firm} and role='owner' and deleted_at is null`,
    ),
  ).toBe(1);
});

it('serializes removal with a manager revocation so an eligible manager remains', async () => {
  const id = await createMatter('Concurrent removal');
  expect((await grant(id, users[1]!, 'manager', 1)).status).toBe(200);
  const responses = await Promise.all([remove(2), grant(id, users[1]!, null, 2, 2)]);
  const statuses = responses.map((r) => r.status);
  expect(statuses.filter((s) => s === 200)).toHaveLength(1);
  expect(statuses.every((s) => [200, 403, 409].includes(s))).toBe(true);
  expect(
    await count(
      sql`select count(*)::int as n from matter_access a join firm_members fm on fm.firm_id=a.firm_id and fm.user_id=a.user_id
      where a.matter_id=${id} and a.deleted_at is null and a.role='manager' and fm.role in ('owner','admin','attorney') and fm.deleted_at is null`,
    ),
  ).toBe(1);
});

it('rolls back membership, grants and receipt when audit insertion fails, then recovers once', async () => {
  const id = await createMatter('Audit failure');
  expect((await grant(id, users[1]!, 'manager', 1)).status).toBe(200);
  const name = `membership_audit_${randomUUID().replaceAll('-', '')}`,
    key = randomUUID();
  try {
    await sql
      .unsafe(
        `create function public.${name}() returns trigger language plpgsql as $$ begin if new.firm_id='${firm}'::uuid and new.action='staff.membership.remove.v1' then raise exception 'test-owned audit failure'; end if; return new; end $$; create trigger ${name} before insert on public.audit_logs for each row execute function public.${name}();`,
      )
      .simple();
    expect((await remove(2, 1, 0, key)).status).toBe(500);
    expect(await membership(2)).toEqual({ role: 'attorney', revision: 1, removed: false });
    expect(
      await count(
        sql`select count(*)::int as n from matter_access where matter_id=${id} and user_id=${users[2]!} and deleted_at is null`,
      ),
    ).toBe(1);
    expect(
      (await sql`select access_revision from matters where id=${id}`)[0]?.access_revision,
    ).toBe(2);
    expect(
      await count(
        sql`select count(*)::int as n from command_receipts where firm_id=${firm} and idempotency_key=${key}`,
      ),
    ).toBe(0);
  } finally {
    await sql
      .unsafe(
        `drop trigger if exists ${name} on public.audit_logs; drop function if exists public.${name}();`,
      )
      .simple();
  }
  expect((await remove(2, 1, 0, key)).status).toBe(200);
  expect((await remove(2, 1, 0, key)).status).toBe(200);
  expect(
    await count(
      sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action='staff.membership.remove.v1'`,
    ),
  ).toBe(1);
});

it('paginates removed staff and membership history without foreign records, omissions or duplicates', async () => {
  for (let i = 0; i < 21; i++) {
    const user = randomUUID();
    extraUsers.push(user);
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@membership.test`},now(),'{}'::jsonb)`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},'paralegal')`;
    const response = await call('/firms/current/staff/removals', 0, {
      userId: user,
      expectedRevision: 1,
      reason: `Reviewed departure ${i}`,
    });
    expect(response.status).toBe(200);
  }
  const first = removedStaffListSchema.parse(
    await (await call('/firms/current/staff/removed')).json(),
  );
  expect(first.items).toHaveLength(20);
  expect(first.items[0]).toMatchObject({ role: 'paralegal', revision: 2, isAvailable: true });
  const second = removedStaffListSchema.parse(
    await (await call(`/firms/current/staff/removed?afterId=${first.nextCursor}`)).json(),
  );
  expect(second.items).toHaveLength(1);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.items, ...second.items].map((x) => x.userId)).size).toBe(21);
  const h1 = staffMembershipHistorySchema.parse(
    await (await call('/firms/current/staff/membership-history')).json(),
  );
  expect(h1.items).toHaveLength(20);
  expect(h1.items[0]).toMatchObject({ change: 'removed', role: 'paralegal', revision: 2 });
  const h2 = staffMembershipHistorySchema.parse(
    await (
      await call(`/firms/current/staff/membership-history?${new URLSearchParams(h1.nextCursor!)}`)
    ).json(),
  );
  expect(h2.items).toHaveLength(1);
  expect(h2.nextCursor).toBeNull();
  expect(new Set([...h1.items, ...h2.items].map((x) => x.id)).size).toBe(21);
  expect(
    (await call(`/firms/current/staff/membership-history?beforeId=${h1.nextCursor!.beforeId}`))
      .status,
  ).toBe(422);
});

it('publishes distinct removal and restoration contracts for generated consumers', () => {
  const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  const ref = (path: string) =>
    (
      doc.paths[path]!.post!.requestBody as {
        content: Record<string, { schema: { $ref: string } }>;
      }
    ).content['application/json']!.schema.$ref;
  const removal = ref('/firms/current/staff/removals'),
    restoration = ref('/firms/current/staff/restorations');
  expect(new Set([removal, restoration, ref('/firms/current/staff/role-changes')]).size).toBe(3);
  const schema = doc.components!.schemas![restoration.split('/').at(-1)!] as {
    properties: Record<string, { enum?: string[] }>;
  };
  expect(schema.properties.role!.enum).toContain('owner');
});
