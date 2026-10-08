import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  contactListSchema,
  type ContactList,
  contactMatterListSchema,
  contactResultSchema,
  matterPartyListSchema,
  matterPartyResultSchema,
} from '@lawfirm/core';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

// Policy edges from the M02-S02 review: each role/grant condition alone, walls for
// owners/admins, per-target action keys, tied sort keys, multi-page lists and removal.
const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local DB required');
const sql = postgres(url, { max: 3 });
const firm = randomUUID();
// 0 owner, 1 paralegal, 2 billing, 3 attorney, 4 admin
const roles = ['owner', 'paralegal', 'billing', 'attorney', 'admin'];
const users = roles.map(() => randomUUID());
const sessions = users.map(() => randomUUID());
const matterA = randomUUID(),
  matterB = randomUUID();
const alpha = randomUUID(),
  beta = randomUUID();
let app: INestApplication, base: string;

async function api(
  method: string,
  path: string,
  index = 0,
  body?: unknown,
  key: string = randomUUID(),
) {
  const token = await new SignJWT({
    role: 'authenticated',
    firm_id: firm,
    user_role: 'owner',
    session_id: sessions[index],
  })
    .setSubject(users[index]!)
    .setIssuer('http://127.0.0.1:54321/auth/v1')
    .setAudience('authenticated')
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long'));
  return fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const parse = async <T>(schema: z.ZodType<T>, response: Response) => {
  expect(response.status).toBeLessThan(300);
  return schema.parse(await response.json());
};
const code = async (response: Response) => ((await response.json()) as { code?: string }).code;
const grant = (matterId: string, index: number, role: 'reader' | 'manager') =>
  sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by)
    values (${firm},${matterId},${users[index]!},${role},${users[0]!})
    on conflict (firm_id,matter_id,user_id) do update set role=excluded.role,deleted_at=null`;
const revoke = (matterId: string, index: number) =>
  sql`update matter_access set deleted_at=now() where matter_id=${matterId} and user_id=${users[index]!}`;
async function readAs(index: number, query: (tx: postgres.TransactionSql) => Promise<unknown>) {
  return sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    const claims = {
      sub: users[index],
      role: 'authenticated',
      firm_id: firm,
      session_id: sessions[index],
    };
    await tx`select set_config('request.jwt.claims',${JSON.stringify(claims)},true)`;
    return query(tx);
  });
}

beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const [i, user] of users.entries()) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@policy.test`},now(),'{}'::jsonb)`;
    await sql`insert into auth.sessions(id,user_id) values (${sessions[i]!},${user})`;
  }
  await sql`insert into firms(id,name) values (${firm},'Contact policy firm')`;
  for (const [i, user] of users.entries())
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},${roles[i]!})`;
  await sql`insert into matters(id,firm_id,title,created_by) values
    (${matterA},${firm},'Policy matter A',${users[0]!}),(${matterB},${firm},'Policy matter B',${users[0]!})`;
  await grant(matterA, 0, 'manager');
  await grant(matterB, 0, 'manager');
  await sql`insert into contacts(id,firm_id,kind,display_name,email,created_by) values
    (${alpha},${firm},'person','Alpha Client','alpha@private.test',${users[0]!}),
    (${beta},${firm},'organization','Beta Holdings',null,${users[0]!})`;
  app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role=replica`;
    await tx`delete from audit_logs where firm_id=${firm}`;
    await tx`delete from command_receipts where firm_id=${firm}`;
    await tx`delete from matter_parties where firm_id=${firm}`;
    await tx`delete from contacts where firm_id=${firm}`;
    await tx`delete from matter_access where firm_id=${firm}`;
    await tx`delete from matters where firm_id=${firm}`;
  });
  await sql`delete from firm_members where firm_id=${firm}`;
  await sql`delete from firms where id=${firm}`;
  for (const user of users) await sql`delete from auth.users where id=${user}`;
  await sql.end();
});

it('applies matter walls to owner and admin roles without a grant', async () => {
  const linked = await api('POST', `/matters/${matterA}/parties`, 0, {
    contactId: alpha,
    role: 'client',
  });
  expect(linked.status).toBe(201);
  expect((await api('GET', `/matters/${matterA}/parties`, 4)).status).toBe(404);
  const forAdmin = await parse(
    contactMatterListSchema,
    await api('GET', `/contacts/${alpha}/matters`, 4),
  );
  expect(forAdmin.items).toEqual([]);
  expect(
    await readAs(4, (tx) => tx`select id from matter_parties where contact_id=${alpha}`),
  ).toEqual([]);
});

it('requires both a manager grant and a managing staff role to change parties', async () => {
  const [party] =
    await sql`select id from matter_parties where matter_id=${matterA} and contact_id=${alpha}`;
  // A managing role with only a reader grant, and non-managing roles holding manager grants.
  await grant(matterA, 3, 'reader');
  await grant(matterA, 1, 'manager');
  await grant(matterA, 2, 'manager');
  try {
    for (const index of [3, 1, 2]) {
      const list = await parse(
        matterPartyListSchema,
        await api('GET', `/matters/${matterA}/parties`, index),
      );
      expect(list.canManage).toBe(false);
      const add = await api('POST', `/matters/${matterA}/parties`, index, {
        contactId: beta,
        role: 'client',
      });
      expect(add.status).toBe(403);
      expect(await code(add)).toBe('MATTER_PARTY_MANAGEMENT_DENIED');
      const end = await api('POST', `/matters/${matterA}/party-endings`, index, {
        partyId: party!.id,
      });
      expect(end.status).toBe(403);
      expect(await code(end)).toBe('MATTER_PARTY_MANAGEMENT_DENIED');
    }
    await grant(matterA, 4, 'manager');
    const admin = await api('POST', `/matters/${matterA}/parties`, 4, {
      contactId: beta,
      role: 'client',
    });
    expect(admin.status).toBe(201);
  } finally {
    for (const index of [1, 2, 3, 4]) await revoke(matterA, index);
  }
});

it('binds every action key to its actor, target and payload', async () => {
  const editKey = randomUUID(),
    edit = { expectedRevision: 1, phone: '+1 212 555 0100' };
  const first = await parse(
    contactResultSchema,
    await api('PATCH', `/contacts/${alpha}`, 0, edit, editKey),
  );
  const replay = await parse(
    contactResultSchema,
    await api('PATCH', `/contacts/${alpha}`, 0, edit, editKey),
  );
  expect(replay.commandId).toBe(first.commandId);
  expect(replay.contact.revision).toBe(2);
  const otherTarget = await api('PATCH', `/contacts/${beta}`, 0, edit, editKey);
  expect(otherTarget.status).toBe(409);
  expect(await code(otherTarget)).toBe('IDEMPOTENCY_CONFLICT');
  const unchanged = await api('PATCH', `/contacts/${alpha}`, 0, {
    expectedRevision: 2,
    phone: '+1 212 555 0100',
  });
  expect(unchanged.status).toBe(409);
  expect(await code(unchanged)).toBe('CONTACT_UNCHANGED');
  const [audit] =
    await sql`select after from audit_logs where firm_id=${firm} and action='contact.update.v1'`;
  expect(JSON.stringify(audit!.after)).not.toMatch(/555 0100|private\.test/);
  expect(audit!.after).toMatchObject({ changed: ['phone'], revision: 2 });

  const linkKey = randomUUID(),
    link = { contactId: beta, role: 'adverse_party' };
  expect((await api('POST', `/matters/${matterB}/parties`, 0, link, linkKey)).status).toBe(201);
  const otherMatter = await api(
    'POST',
    `/matters/${matterA}/parties`,
    0,
    { contactId: alpha, role: 'other', label: 'x' },
    linkKey,
  );
  expect(otherMatter.status).toBe(409);
  const sameBodyOtherMatter = await api('POST', `/matters/${matterA}/parties`, 0, link, linkKey);
  expect(await code(sameBodyOtherMatter)).toBe('IDEMPOTENCY_CONFLICT');

  const parties = await parse(
    matterPartyListSchema,
    await api('GET', `/matters/${matterA}/parties`),
  );
  const [one, two] = parties.items;
  const endKey = randomUUID();
  expect(
    (await api('POST', `/matters/${matterA}/party-endings`, 0, { partyId: one!.id }, endKey))
      .status,
  ).toBe(200);
  const otherParty = await api(
    'POST',
    `/matters/${matterA}/party-endings`,
    0,
    { partyId: two!.id },
    endKey,
  );
  expect(otherParty.status).toBe(409);
  expect(await code(otherParty)).toBe('IDEMPOTENCY_CONFLICT');

  const createKey = randomUUID(),
    create = { kind: 'person', displayName: 'Shared Key Person' };
  const mine = await parse(
    contactResultSchema,
    await api('POST', '/contacts', 0, create, createKey),
  );
  const theirs = await parse(
    contactResultSchema,
    await api('POST', '/contacts', 4, create, createKey),
  );
  expect(theirs.contact.id).not.toBe(mine.contact.id);
});

it('pages through tied and case-variant names without skips, repeats or losing the search', async () => {
  await sql`insert into contacts(firm_id,kind,display_name,created_by)
    select ${firm},'person',case when n=23 then 'same name' else 'Same Name' end,${users[0]!}
    from generate_series(1,23) n`;
  const seen: string[] = [];
  let cursor: Record<string, string> | null = {};
  let pages = 0;
  while (cursor) {
    const page: ContactList = await parse(
      contactListSchema,
      await api('GET', `/contacts?${new URLSearchParams({ q: 'same', ...cursor })}`, 2),
    );
    expect(page.items.every((c) => c.displayName.toLowerCase() === 'same name')).toBe(true);
    seen.push(...page.items.map((c) => c.id));
    cursor = page.nextCursor;
    pages++;
  }
  expect(pages).toBe(2);
  expect(seen).toHaveLength(23);
  expect(new Set(seen).size).toBe(23);
});

it('pages party and contact-matter lists beyond twenty and drops deleted matters', async () => {
  const many = await sql`insert into matters(firm_id,title,created_by)
    select ${firm},'Paged matter '||lpad(n::text,2,'0'),${users[0]!} from generate_series(1,21) n returning id`;
  for (const m of many) {
    await grant(m.id, 0, 'manager');
    await sql`insert into matter_parties(firm_id,matter_id,contact_id,role,created_by) values (${firm},${m.id},${beta},'client',${users[0]!})`;
  }
  const extra = await sql`insert into contacts(firm_id,kind,display_name,created_by)
    select ${firm},'person','Party '||n,${users[0]!} from generate_series(1,21) n returning id`;
  for (const c of extra)
    await sql`insert into matter_parties(firm_id,matter_id,contact_id,role,label,created_by)
      values (${firm},${matterB},${c.id},'other','Witness',${users[0]!})`;
  const walk = async <T extends { nextCursor: string | null }>(
    schema: z.ZodType<T>,
    path: string,
    ids: (page: T) => string[],
  ) => {
    const all: string[] = [];
    let after: string | null = null;
    do {
      const page: T = await parse(
        schema,
        await api('GET', `${path}${after ? `?afterId=${after}` : ''}`),
      );
      all.push(...ids(page));
      after = page.nextCursor;
    } while (after);
    return all;
  };
  const matters = await walk(contactMatterListSchema, `/contacts/${beta}/matters`, (p) =>
    p.items.map((m) => m.matterId),
  );
  expect(new Set(matters).size).toBe(matters.length);
  expect(matters).toEqual(expect.arrayContaining([matterB, ...many.map((m) => m.id)]));
  const parties = await walk(matterPartyListSchema, `/matters/${matterB}/parties`, (p) =>
    p.items.map((x) => x.id),
  );
  expect(parties.length).toBeGreaterThanOrEqual(22);
  expect(new Set(parties).size).toBe(parties.length);

  await sql`update matters set deleted_at=now() where id=${many[0]!.id}`;
  const after = await walk(contactMatterListSchema, `/contacts/${beta}/matters`, (p) =>
    p.items.map((m) => m.matterId),
  );
  expect(after).not.toContain(many[0]!.id);
  expect(
    await readAs(0, (tx) => tx`select id from matter_parties where matter_id=${many[0]!.id}`),
  ).toEqual([]);
});

it('keeps ended links readable as history for granted staff and removes everything from removed members', async () => {
  const ended =
    await sql`select id from matter_parties where firm_id=${firm} and deleted_at is not null`;
  expect(ended.length).toBeGreaterThan(0);
  const history = await readAs(
    0,
    (tx) => tx`select id from matter_parties where deleted_at is not null`,
  );
  expect(history).toEqual(expect.arrayContaining(ended.map((r) => ({ id: r.id }))));
  await grant(matterA, 1, 'reader');
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[1]!}`;
  try {
    expect(await readAs(1, (tx) => tx`select id from contacts`)).toEqual([]);
    expect(await readAs(1, (tx) => tx`select id from matter_parties`)).toEqual([]);
    expect((await api('GET', `/contacts/${alpha}/matters`, 1)).status).toBe(403);
  } finally {
    await sql`update firm_members set deleted_at=null where firm_id=${firm} and user_id=${users[1]!}`;
    await revoke(matterA, 1);
  }
});

it('replays a party ending only while the matter grant is current', async () => {
  const parties = await parse(
    matterPartyListSchema,
    await api('GET', `/matters/${matterB}/parties`),
  );
  const target = parties.items.find((p) => p.contactId === beta)!;
  const key = randomUUID();
  const first = await parse(
    matterPartyResultSchema,
    await api('POST', `/matters/${matterB}/party-endings`, 0, { partyId: target.id }, key),
  );
  const replay = await parse(
    matterPartyResultSchema,
    await api('POST', `/matters/${matterB}/party-endings`, 0, { partyId: target.id }, key),
  );
  expect(replay).toEqual(first);
  await revoke(matterB, 0);
  expect(
    (await api('POST', `/matters/${matterB}/party-endings`, 0, { partyId: target.id }, key)).status,
  ).toBe(404);
  await grant(matterB, 0, 'manager');
});

it('keeps contact email and phone out of durable command receipts', async () => {
  await parse(
    contactResultSchema,
    await api('POST', '/contacts', 0, {
      kind: 'person',
      displayName: 'Receipt Person',
      email: 'receipt@private.test',
      phone: '+1 646 555 0142',
    }),
  );
  const receipts = await sql`select command,response from command_receipts
    where firm_id=${firm} and command in ('contact.create.v1','contact.update.v1')`;
  expect(receipts.length).toBeGreaterThanOrEqual(3);
  for (const receipt of receipts)
    expect(JSON.stringify(receipt.response)).not.toMatch(/private\.test|555 01|"email"|"phone"/);
});
