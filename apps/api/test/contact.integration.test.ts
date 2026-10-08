import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  contactDetailSchema,
  contactListSchema,
  contactMatterListSchema,
  contactResultSchema,
  matterPartyListSchema,
  matterPartyResultSchema,
  type ContactRecord,
} from '@lawfirm/core';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local DB required');
const sql = postgres(url, { max: 3 });
const firm = randomUUID(),
  otherFirm = randomUUID();
// 0 owner (matter manager), 1 paralegal (reader on matter A), 2 readonly, 3 other-firm owner,
// 4 attorney without grants, 5 billing, 6 admin used for role checks.
const roles = ['owner', 'paralegal', 'readonly', 'owner', 'attorney', 'billing', 'admin'];
const users = roles.map(() => randomUUID());
const sessions = users.map(() => randomUUID());
const matterA = randomUUID(),
  matterB = randomUUID(),
  foreignMatter = randomUUID();
let app: INestApplication, base: string;

async function token(index: number) {
  return new SignJWT({
    role: 'authenticated',
    firm_id: index === 3 ? otherFirm : firm,
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
async function api(
  method: string,
  path: string,
  index = 0,
  body?: unknown,
  key: string = randomUUID(),
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await token(index)}`,
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
const get = <T>(schema: z.ZodType<T>, path: string, index = 0) =>
  api('GET', path, index).then((r) => parse(schema, r));
async function created(index: number, body: Record<string, unknown>) {
  const response = await api('POST', '/contacts', index, body);
  expect(response.status).toBe(201);
  return (await parse(contactResultSchema, response)).contact;
}
const count = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n;

beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const [i, user] of users.entries()) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@contact.test`},now(),'{}'::jsonb)`;
    await sql`insert into auth.sessions(id,user_id) values (${sessions[i]!},${user})`;
  }
  await sql`insert into firms(id,name) values (${firm},'Contact test firm'),(${otherFirm},'Other contact firm')`;
  for (const [i, user] of users.entries())
    await sql`insert into firm_members(firm_id,user_id,role) values (${i === 3 ? otherFirm : firm},${user},${roles[i]!})`;
  await sql`insert into matters(id,firm_id,title,created_by) values
    (${matterA},${firm},'Share purchase advisory',${users[0]!}),
    (${matterB},${firm},'Restricted estate plan',${users[0]!}),
    (${foreignMatter},${otherFirm},'Foreign matter',${users[3]!})`;
  await sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values
    (${firm},${matterA},${users[0]!},'manager',${users[0]!}),
    (${firm},${matterB},${users[0]!},'manager',${users[0]!}),
    (${firm},${matterA},${users[1]!},'reader',${users[0]!}),
    (${otherFirm},${foreignMatter},${users[3]!},'manager',${users[3]!})`;
  app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  const [exists] = await sql`select to_regclass('public.contacts') is not null as present`;
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role=replica`;
    await tx`delete from audit_logs where firm_id in (${firm},${otherFirm})`;
    await tx`delete from command_receipts where firm_id in (${firm},${otherFirm})`;
    if (exists?.present) {
      await tx`delete from matter_parties where firm_id in (${firm},${otherFirm})`;
      await tx`delete from contacts where firm_id in (${firm},${otherFirm})`;
    }
    await tx`delete from matter_access where firm_id in (${firm},${otherFirm})`;
    await tx`delete from matters where firm_id in (${firm},${otherFirm})`;
  });
  await sql`delete from firm_members where firm_id in (${firm},${otherFirm})`;
  await sql`delete from firms where id in (${firm},${otherFirm})`;
  for (const user of users) await sql`delete from auth.users where id=${user}`;
  await sql.end();
});

let client: ContactRecord, coClient: ContactRecord, adverse: ContactRecord;
let foreignContact: ContactRecord;

it('creates one person contact under concurrent identical requests without personal details in audit', async () => {
  const key = randomUUID();
  const input = {
    kind: 'person',
    displayName: '  Maria Alvarez  ',
    email: 'maria@example.test',
    phone: '+1 (415) 555-0100',
  };
  const responses = await Promise.all([
    api('POST', '/contacts', 0, input, key),
    api('POST', '/contacts', 0, input, key),
  ]);
  expect(responses.map((r) => r.status)).toEqual([201, 201]);
  const [first, replay] = await Promise.all(responses.map((r) => parse(contactResultSchema, r)));
  expect(replay).toEqual(first);
  client = first!.contact;
  expect(client).toMatchObject({
    firmId: firm,
    kind: 'person',
    displayName: 'Maria Alvarez',
    email: 'maria@example.test',
    phone: '+1 (415) 555-0100',
    revision: 1,
  });
  expect(await count(sql`select count(*)::int as n from contacts where firm_id=${firm}`)).toBe(1);
  const audits =
    await sql`select after from audit_logs where firm_id=${firm} and action='contact.create.v1'`;
  expect(audits).toHaveLength(1);
  expect(JSON.stringify(audits[0]!.after)).not.toMatch(/maria@example|555-0100/);
  const reused = await api('POST', '/contacts', 0, { ...input, displayName: 'Other' }, key);
  expect(reused.status).toBe(409);
  expect(await code(reused)).toBe('IDEMPOTENCY_CONFLICT');
});

it('creates organizations, validates input and applies the contact capability to every live role', async () => {
  coClient = await created(1, { kind: 'organization', displayName: 'Alvarez Holdings LLC' });
  expect(coClient).toMatchObject({ kind: 'organization', email: null, phone: null });
  adverse = await created(4, { kind: 'organization', displayName: 'Bennett 100% Trust_Co' });
  foreignContact = await created(3, { kind: 'person', displayName: 'Maria Foreign' });
  expect(foreignContact.firmId).toBe(otherFirm);
  expect(await created(6, { kind: 'person', displayName: 'Admin Created' })).toBeTruthy();
  for (const index of [2, 5]) {
    const denied = await api('POST', '/contacts', index, { kind: 'person', displayName: 'No' });
    expect(denied.status).toBe(403);
    expect(await code(denied)).toBe('CAPABILITY_DENIED');
  }
  for (const input of [
    { kind: 'person', displayName: '' },
    { kind: 'robot', displayName: 'x' },
    { kind: 'person', displayName: 'x', email: 'not-an-email' },
    { kind: 'person', displayName: 'x', phone: 'call me maybe' },
    { kind: 'person', displayName: 'x', firmId: otherFirm },
    { kind: 'person', displayName: 'x', revision: 4 },
    { kind: 'person', displayName: 'x'.repeat(201) },
  ])
    expect((await api('POST', '/contacts', 0, input)).status).toBe(422);
  expect((await fetch(`${base}/contacts`)).status).toBe(401);
});

it('edits against the reviewed revision exactly once under concurrent review', async () => {
  const path = `/contacts/${client.id}`;
  const key = randomUUID();
  const ownerEdit = { expectedRevision: 1, email: 'maria@alvarez.test' };
  const [a, b] = await Promise.all([
    api('PATCH', path, 0, ownerEdit, key),
    api('PATCH', path, 1, { expectedRevision: 1, phone: null }),
  ]);
  expect([a.status, b.status].sort()).toEqual([200, 409]);
  const [winner, loser] = a.status === 200 ? [a, b] : [b, a];
  const result = await parse(contactResultSchema, winner);
  expect(result.contact.revision).toBe(2);
  expect(await code(loser)).toBe('CONTACT_CHANGED');
  if (winner === a) {
    const replay = await api('PATCH', path, 0, ownerEdit, key);
    expect((await parse(contactResultSchema, replay)).commandId).toBe(result.commandId);
  }
  const current = await get(contactDetailSchema, path, 2);
  expect(current.contact.revision).toBe(2);
  expect(current.canEdit).toBe(false);
  client = current.contact;
  const stale = await api('PATCH', path, 0, { expectedRevision: 1, displayName: 'Stale' });
  expect(stale.status).toBe(409);
  expect((await api('PATCH', path, 0, { expectedRevision: 2 })).status).toBe(422);
  expect((await api('PATCH', path, 0, { expectedRevision: 2, kind: 'organization' })).status).toBe(
    422,
  );
  for (const index of [2, 5])
    expect(
      (await api('PATCH', path, index, { expectedRevision: 2, displayName: 'No' })).status,
    ).toBe(403);
  const foreign = { expectedRevision: 1, displayName: 'X' };
  expect((await api('PATCH', `/contacts/${foreignContact.id}`, 0, foreign)).status).toBe(404);
  expect(
    await count(
      sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action='contact.update.v1'`,
    ),
  ).toBe(1);
});

it('lists the firm directory alphabetically with bounded, literal, case-insensitive search', async () => {
  for (let i = 0; i < 20; i++)
    await created(0, { kind: 'person', displayName: `Zeta Person ${String(i).padStart(2, '0')}` });
  const first = await get(contactListSchema, '/contacts', 2);
  expect(first.items).toHaveLength(20);
  expect(first.canEdit).toBe(false);
  expect(first.items.slice(0, 4).map((c) => c.displayName)).toEqual([
    'Admin Created',
    'Alvarez Holdings LLC',
    'Bennett 100% Trust_Co',
    'Maria Alvarez',
  ]);
  expect(first.items.every((c) => c.firmId === firm)).toBe(true);
  expect(first.nextCursor).not.toBeNull();
  const second = await get(
    contactListSchema,
    `/contacts?${new URLSearchParams(first.nextCursor!)}`,
    2,
  );
  expect(second.items).toHaveLength(4);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.items, ...second.items].map((c) => c.id)).size).toBe(24);
  const search = async (q: string, index = 0) =>
    (await get(contactListSchema, `/contacts?${new URLSearchParams({ q })}`, index)).items.map(
      (c) => c.displayName,
    );
  expect(await search('ALVAREZ')).toEqual(['Alvarez Holdings LLC', 'Maria Alvarez']);
  expect(await search('100%')).toEqual(['Bennett 100% Trust_Co']);
  expect(await search('%')).toEqual(['Bennett 100% Trust_Co']);
  expect(await search('_')).toEqual(['Bennett 100% Trust_Co']);
  expect(await search('maria', 3)).toEqual(['Maria Foreign']);
  expect((await get(contactListSchema, '/contacts', 0)).canEdit).toBe(true);
  for (const query of ['q=', `q=${'x'.repeat(101)}`, 'afterId=bad', `afterId=${client.id}`])
    expect((await api('GET', `/contacts?${query}`, 0)).status).toBe(422);
  expect((await api('GET', `/contacts/${foreignContact.id}`, 0)).status).toBe(404);
  expect((await api('GET', `/contacts/${randomUUID()}`, 0)).status).toBe(404);
});

it('represents one client in several matters and several clients in one matter', async () => {
  const link = (matterId: string, body: Record<string, unknown>, index = 0, key?: string) =>
    api('POST', `/matters/${matterId}/parties`, index, body, key);
  const key = randomUUID();
  const responses = await Promise.all([
    link(matterA, { contactId: client.id, role: 'client' }, 0, key),
    link(matterA, { contactId: client.id, role: 'client' }, 0, key),
  ]);
  expect(responses.map((r) => r.status)).toEqual([201, 201]);
  const [linked, replay] = await Promise.all(
    responses.map((r) => parse(matterPartyResultSchema, r)),
  );
  expect(replay).toEqual(linked);
  expect(linked!.party).toMatchObject({
    matterId: matterA,
    contactId: client.id,
    role: 'client',
    label: null,
    endedAt: null,
    contact: { displayName: 'Maria Alvarez', kind: 'person' },
  });
  expect((await link(matterB, { contactId: client.id, role: 'client' })).status).toBe(201);
  expect((await link(matterA, { contactId: coClient.id, role: 'client' })).status).toBe(201);
  const lender = { contactId: adverse.id, role: 'other', label: 'Lender' };
  expect((await link(matterA, lender)).status).toBe(201);
  const duplicate = await link(matterA, { contactId: client.id, role: 'adverse_party' });
  expect(duplicate.status).toBe(409);
  expect(await code(duplicate)).toBe('PARTY_EXISTS');
  for (const body of [
    { contactId: coClient.id, role: 'other' },
    { contactId: coClient.id, role: 'judge' },
    { contactId: coClient.id, role: 'client', firmId: otherFirm },
  ])
    expect((await link(matterB, body)).status).toBe(422);
  const foreign = await link(matterB, { contactId: foreignContact.id, role: 'client' });
  expect(foreign.status).toBe(404);
  expect(await code(foreign)).toBe('CONTACT_UNAVAILABLE');
  for (const matterId of [foreignMatter, randomUUID()]) {
    const unavailable = await link(matterId, { contactId: client.id, role: 'client' });
    expect(unavailable.status).toBe(404);
    expect(await code(unavailable)).toBe('MATTER_UNAVAILABLE');
  }
  const reused = await link(matterB, { contactId: coClient.id, role: 'client' }, 0, key);
  expect(reused.status).toBe(409);

  const parties = await get(matterPartyListSchema, `/matters/${matterA}/parties`);
  expect(parties.canManage).toBe(true);
  expect(
    parties.items
      .filter((p) => p.role === 'client')
      .map((p) => p.contact.displayName)
      .sort(),
  ).toEqual(['Alvarez Holdings LLC', 'Maria Alvarez']);
  const matters = await get(contactMatterListSchema, `/contacts/${client.id}/matters`);
  expect(matters.items.map((m) => m.title).sort()).toEqual([
    'Restricted estate plan',
    'Share purchase advisory',
  ]);
  expect(matters.items.every((m) => m.role === 'client')).toBe(true);
});

it('discloses links only through current matter grants', async () => {
  const forParalegal = await get(contactMatterListSchema, `/contacts/${client.id}/matters`, 1);
  expect(forParalegal.items.map((m) => m.matterId)).toEqual([matterA]);
  const readerParties = await get(matterPartyListSchema, `/matters/${matterA}/parties`, 1);
  expect(readerParties.canManage).toBe(false);
  expect((await api('GET', `/matters/${matterB}/parties`, 1)).status).toBe(404);
  const witness = { contactId: client.id, role: 'other', label: 'Witness' };
  const denied = await api('POST', `/matters/${matterA}/parties`, 1, witness);
  expect(denied.status).toBe(403);
  expect(await code(denied)).toBe('MATTER_PARTY_MANAGEMENT_DENIED');
  const ungranted = await api('GET', `/contacts/${client.id}`, 4);
  const body = await ungranted.text();
  expect(contactDetailSchema.parse(JSON.parse(body)).contact.displayName).toBe('Maria Alvarez');
  expect(body).not.toMatch(/Restricted estate|Share purchase|matter/i);
  expect((await get(contactMatterListSchema, `/contacts/${client.id}/matters`, 4)).items).toEqual(
    [],
  );
  expect((await api('GET', `/matters/${matterA}/parties`, 4)).status).toBe(404);
  expect((await api('GET', `/contacts/${client.id}/matters`, 3)).status).toBe(404);

  await sql`update matter_access set deleted_at=now() where matter_id=${matterA} and user_id=${users[1]!}`;
  expect((await get(contactMatterListSchema, `/contacts/${client.id}/matters`, 1)).items).toEqual(
    [],
  );
  expect((await api('GET', `/matters/${matterA}/parties`, 1)).status).toBe(404);
  await sql`update matter_access set deleted_at=null where matter_id=${matterA} and user_id=${users[1]!}`;
  await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[1]!}`;
  expect((await api('GET', '/contacts', 1)).status).toBe(403);
  expect((await api('GET', `/contacts/${client.id}`, 1)).status).toBe(403);
  await sql`update firm_members set deleted_at=null where firm_id=${firm} and user_id=${users[1]!}`;
});

it('ends a party link once, keeps its history and allows a later new link', async () => {
  const parties = await get(matterPartyListSchema, `/matters/${matterB}/parties`);
  const party = parties.items.find((p) => p.contactId === client.id)!;
  const key = randomUUID();
  const end = (index = 0, k: string = key, matterId = matterB) =>
    api('POST', `/matters/${matterId}/party-endings`, index, { partyId: party.id }, k);
  expect((await end(1)).status).toBe(404);
  const [a, b] = await Promise.all([end(), end()]);
  expect([a.status, b.status]).toEqual([200, 200]);
  const ended = await parse(matterPartyResultSchema, a);
  expect(await parse(matterPartyResultSchema, b)).toEqual(ended);
  expect(ended.party.endedAt).toEqual(expect.any(String));
  const again = await end(0, randomUUID());
  expect(again.status).toBe(409);
  expect(await code(again)).toBe('PARTY_ENDED');
  expect((await end(0, randomUUID(), matterA)).status).toBe(404);
  expect(
    (await get(matterPartyListSchema, `/matters/${matterB}/parties`)).items.map((p) => p.id),
  ).not.toContain(party.id);
  expect(
    (await get(contactMatterListSchema, `/contacts/${client.id}/matters`)).items.map(
      (m) => m.matterId,
    ),
  ).toEqual([matterA]);
  expect(
    await count(
      sql`select count(*)::int as n from matter_parties where id=${party.id} and deleted_at is not null`,
    ),
  ).toBe(1);
  const relinked = await api('POST', `/matters/${matterB}/parties`, 0, {
    contactId: client.id,
    role: 'adverse_party',
  });
  expect((await parse(matterPartyResultSchema, relinked)).party.id).not.toBe(party.id);
  expect(
    await count(
      sql`select count(*)::int as n from audit_logs where firm_id=${firm} and action in ('matter.party.add.v1','matter.party.end.v1')`,
    ),
  ).toBe(6);
});

it('enforces tenant, wall and write rules for authenticated SQL reads', async () => {
  async function read(index: number, query: (tx: postgres.TransactionSql) => Promise<unknown>) {
    return sql.begin(async (tx) => {
      await tx`set local role authenticated`;
      const claims = {
        sub: users[index],
        role: 'authenticated',
        firm_id: index === 3 ? otherFirm : firm,
        session_id: sessions[index],
      };
      await tx`select set_config('request.jwt.claims',${JSON.stringify(claims)},true)`;
      return query(tx);
    });
  }
  const contactsFor = (index: number) =>
    read(
      index,
      (tx) => tx`select id from contacts where id in (${client.id},${foreignContact.id})`,
    );
  expect(await contactsFor(4)).toEqual([{ id: client.id }]);
  expect(await contactsFor(3)).toEqual([{ id: foreignContact.id }]);
  const partiesFor = (index: number) =>
    read(
      index,
      (tx) =>
        tx`select matter_id from matter_parties where contact_id=${client.id} and deleted_at is null order by matter_id`,
    );
  expect(await partiesFor(0)).toHaveLength(2);
  expect(await partiesFor(1)).toEqual([{ matter_id: matterA }]);
  expect(await partiesFor(4)).toEqual([]);
  await expect(
    read(
      0,
      (tx) =>
        tx`insert into contacts(firm_id,kind,display_name,created_by) values (${firm},'person','Illegal',${users[0]!})`,
    ),
  ).rejects.toMatchObject({ code: '42501' });
  await expect(
    read(0, (tx) => tx`update contacts set display_name='Illegal' where id=${client.id}`),
  ).rejects.toMatchObject({ code: '42501' });
  await expect(
    sql`insert into matter_parties(firm_id,matter_id,contact_id,role,created_by) values (${firm},${matterA},${foreignContact.id},'client',${users[0]!})`,
  ).rejects.toMatchObject({ code: '23503' });
  await expect(
    sql`update contacts set firm_id=${otherFirm} where id=${client.id}`,
  ).rejects.toMatchObject({ code: '42501' });
});
