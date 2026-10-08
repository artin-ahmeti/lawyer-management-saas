import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  forumListSchema,
  forumResultSchema,
  matterJurisdictionListSchema,
  matterJurisdictionResultSchema,
  usJurisdictions,
  type ForumRecord,
} from '@lawfirm/core';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local DB required');
const sql = postgres(url, { max: 3 });
const firm = randomUUID(),
  otherFirm = randomUUID();
// 0 owner (manager on A and B), 1 paralegal (manager on A), 2 readonly (reader on A),
// 3 other-firm owner, 4 attorney without grants, 5 billing (manager on A), 6 admin (reader on A).
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
const forums = (query = '', index = 0) =>
  api('GET', `/forums${query}`, index).then((r) => parse(forumListSchema, r));
const references = (matter: string, index = 0) =>
  api('GET', `/matters/${matter}/jurisdictions`, index).then((r) =>
    parse(matterJurisdictionListSchema, r),
  );
async function forum(index: number, body: Record<string, unknown>) {
  const response = await api('POST', '/forums', index, body);
  expect(response.status).toBe(201);
  return (await parse(forumResultSchema, response)).forum;
}
async function added(matter: string, body: Record<string, unknown>, index = 0, key?: string) {
  const response = await api('POST', `/matters/${matter}/jurisdictions`, index, body, key);
  expect(response.status).toBe(201);
  return parse(matterJurisdictionResultSchema, response);
}
const count = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n;

beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const [i, user] of users.entries()) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@jurisdiction.test`},now(),'{}'::jsonb)`;
    await sql`insert into auth.sessions(id,user_id) values (${sessions[i]!},${user})`;
  }
  await sql`insert into firms(id,name) values (${firm},'Jurisdiction test firm'),(${otherFirm},'Other jurisdiction firm')`;
  for (const [i, user] of users.entries())
    await sql`insert into firm_members(firm_id,user_id,role) values (${i === 3 ? otherFirm : firm},${user},${roles[i]!})`;
  await sql`insert into matters(id,firm_id,title,created_by) values
    (${matterA},${firm},'Cross-border supply dispute',${users[0]!}),
    (${matterB},${firm},'Restricted licensing advice',${users[0]!}),
    (${foreignMatter},${otherFirm},'Foreign matter',${users[3]!})`;
  await sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values
    (${firm},${matterA},${users[0]!},'manager',${users[0]!}),
    (${firm},${matterB},${users[0]!},'manager',${users[0]!}),
    (${firm},${matterA},${users[1]!},'manager',${users[0]!}),
    (${firm},${matterA},${users[2]!},'reader',${users[0]!}),
    (${firm},${matterA},${users[5]!},'manager',${users[0]!}),
    (${firm},${matterA},${users[6]!},'reader',${users[0]!}),
    (${otherFirm},${foreignMatter},${users[3]!},'manager',${users[3]!})`;
  app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  const [exists] = await sql`select to_regclass('public.forums') is not null as present`;
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role=replica`;
    await tx`delete from audit_logs where firm_id in (${firm},${otherFirm})`;
    await tx`delete from command_receipts where firm_id in (${firm},${otherFirm})`;
    if (exists?.present) {
      await tx`delete from matter_jurisdictions where firm_id in (${firm},${otherFirm})`;
      await tx`delete from forums where firm_id in (${firm},${otherFirm})`;
    }
    await tx`delete from matter_access where firm_id in (${firm},${otherFirm})`;
    await tx`delete from matters where firm_id in (${firm},${otherFirm})`;
  });
  await sql`delete from firm_members where firm_id in (${firm},${otherFirm})`;
  await sql`delete from firms where id in (${firm},${otherFirm})`;
  for (const user of users) await sql`delete from auth.users where id=${user}`;
  await sql.end();
});

it('stores exactly the shared jurisdiction catalog in both database checks', async () => {
  const checks = await sql`select conname,pg_get_constraintdef(oid) as def from pg_constraint
    where conname in ('forums_jurisdiction','matter_jurisdictions_jurisdiction') order by conname`;
  expect(checks).toHaveLength(2);
  for (const check of checks)
    expect([...String(check.def).matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]).sort()).toEqual(
      usJurisdictions.map((j) => j.code).sort(),
    );
});

let federalCourt: ForumRecord, nyCourt: ForumRecord, caAgency: ForumRecord;
let foreignForum: ForumRecord;

it('creates one forum under concurrent identical requests and audits it', async () => {
  const key = randomUUID();
  const input = { name: '  U.S. District Court, S.D.N.Y.  ', kind: 'court', jurisdiction: 'US' };
  const responses = await Promise.all([
    api('POST', '/forums', 0, input, key),
    api('POST', '/forums', 0, input, key),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([201, 201]);
  const [first, second] = await Promise.all(responses.map((r) => parse(forumResultSchema, r)));
  expect(second!.forum.id).toBe(first!.forum.id);
  expect(second!.commandId).toBe(first!.commandId);
  federalCourt = first!.forum;
  expect(federalCourt).toMatchObject({
    name: 'U.S. District Court, S.D.N.Y.',
    kind: 'court',
    jurisdiction: 'US',
    archived: false,
    revision: 1,
  });
  expect(await count(sql`select count(*)::int as n from forums where firm_id=${firm}`)).toBe(1);
  const [audit] = await sql`select action,record_type,record_id,after from audit_logs
    where firm_id=${firm} and command_id=${first!.commandId}`;
  expect(audit).toMatchObject({
    action: 'forum.create.v1',
    record_type: 'forum',
    record_id: federalCourt.id,
    after: { name: federalCourt.name, kind: 'court', jurisdiction: 'US', revision: 1 },
  });
});

it('lets owners, admins, attorneys and paralegals add forums but not billing or readonly staff', async () => {
  nyCourt = await forum(1, {
    name: 'Supreme Court of the State of New York, New York County',
    kind: 'court',
    jurisdiction: 'NY',
  });
  caAgency = await forum(4, {
    name: 'Department of Industrial Relations',
    kind: 'agency',
    jurisdiction: 'CA',
  });
  await forum(6, {
    name: 'American Arbitration Association',
    kind: 'tribunal',
    jurisdiction: 'NY',
  });
  for (const index of [2, 5]) {
    const refused = await api('POST', '/forums', index, {
      name: 'Refused forum',
      kind: 'agency',
      jurisdiction: 'TX',
    });
    expect(refused.status).toBe(403);
    expect(await code(refused)).toBe('CAPABILITY_DENIED');
  }
  foreignForum = await forum(3, {
    name: 'Department of Industrial Relations',
    kind: 'agency',
    jurisdiction: 'CA',
  });
});

it('keeps forum names unique per jurisdiction among active forums', async () => {
  const taken = await api('POST', '/forums', 0, {
    name: 'department of industrial relations',
    kind: 'agency',
    jurisdiction: 'CA',
  });
  expect(taken.status).toBe(409);
  expect(await code(taken)).toBe('FORUM_NAME_TAKEN');
  // The same name under another jurisdiction is a different body.
  await forum(0, {
    name: 'Department of Industrial Relations',
    kind: 'agency',
    jurisdiction: 'PR',
  });
});

it('lists firm forums for every live role, filtered by jurisdiction, never another firm', async () => {
  const all = await forums('', 2);
  expect(all.canCreate).toBe(false);
  expect(all.canManage).toBe(false);
  expect(all.items.map((f) => f.name)).toEqual([
    'American Arbitration Association',
    'Department of Industrial Relations',
    'Department of Industrial Relations',
    'Supreme Court of the State of New York, New York County',
    'U.S. District Court, S.D.N.Y.',
  ]);
  expect(all.items.every((f) => f.firmId === firm)).toBe(true);
  expect((await forums('?jurisdiction=CA', 1)).items.map((f) => f.id)).toEqual([caAgency.id]);
  const paralegal = await forums('', 1);
  expect([paralegal.canCreate, paralegal.canManage]).toEqual([true, false]);
  const owner = await forums('', 0);
  expect([owner.canCreate, owner.canManage]).toEqual([true, true]);
  expect((await forums('', 3)).items.map((f) => f.id)).toEqual([foreignForum.id]);
});

it('renames and archives forums for owners/admins with a reviewed revision', async () => {
  const refused = await api('PATCH', `/forums/${nyCourt.id}`, 1, {
    expectedRevision: 1,
    name: 'NY Supreme Court',
  });
  expect(refused.status).toBe(403);
  expect(await code(refused)).toBe('CAPABILITY_DENIED');
  const renamed = await parse(
    forumResultSchema,
    await api('PATCH', `/forums/${nyCourt.id}`, 6, {
      expectedRevision: 1,
      name: 'New York Supreme Court, New York County',
    }),
  );
  expect(renamed.forum).toMatchObject({ revision: 2, kind: 'court', jurisdiction: 'NY' });
  nyCourt = renamed.forum;
  const stale = await api('PATCH', `/forums/${nyCourt.id}`, 0, {
    expectedRevision: 1,
    archived: true,
  });
  expect(stale.status).toBe(409);
  expect(await code(stale)).toBe('FORUM_CHANGED');
  const unchanged = await api('PATCH', `/forums/${nyCourt.id}`, 0, {
    expectedRevision: 2,
    name: nyCourt.name,
  });
  expect(unchanged.status).toBe(409);
  expect(await code(unchanged)).toBe('FORUM_UNCHANGED');
  const foreign = await api('PATCH', `/forums/${foreignForum.id}`, 0, {
    expectedRevision: 1,
    archived: true,
  });
  expect(foreign.status).toBe(404);
  expect(await code(foreign)).toBe('FORUM_UNAVAILABLE');
});

it('holds no reference on a new matter and governing law alone needs no court', async () => {
  const empty = await references(matterA);
  expect(empty).toEqual({ matterId: matterA, items: [], canManage: true });
  const key = randomUUID();
  const { reference, commandId } = await added(
    matterA,
    { purpose: 'governing_law', jurisdiction: 'DE' },
    0,
    key,
  );
  expect(reference).toMatchObject({
    matterId: matterA,
    purpose: 'governing_law',
    jurisdiction: 'DE',
    forum: null,
    docketNumber: null,
    label: null,
    automation: 'none',
    endedAt: null,
  });
  const replay = await added(matterA, { purpose: 'governing_law', jurisdiction: 'DE' }, 0, key);
  expect(replay).toEqual({ reference, commandId });
  const misuse = await api(
    'POST',
    `/matters/${matterA}/jurisdictions`,
    0,
    { purpose: 'governing_law', jurisdiction: 'NY' },
    key,
  );
  expect(misuse.status).toBe(409);
  expect(await code(misuse)).toBe('IDEMPOTENCY_CONFLICT');
  expect(
    await count(
      sql`select count(*)::int as n from matter_jurisdictions where matter_id=${matterA}`,
    ),
  ).toBe(1);
});

it('adds agency work and two venues in different jurisdictions with docket numbers kept out of audits and receipts', async () => {
  const agency = await added(
    matterA,
    {
      purpose: 'agency',
      jurisdiction: 'CA',
      forumId: caAgency.id,
      docketNumber: 'ADJ-123456',
    },
    1,
  );
  expect(agency.reference.forum).toEqual({
    id: caAgency.id,
    name: caAgency.name,
    kind: 'agency',
    archived: false,
  });
  await added(matterA, {
    purpose: 'venue',
    jurisdiction: 'US',
    forumId: federalCourt.id,
    docketNumber: '1:26-cv-04410',
  });
  // A retry that changes identifier case is the same intent, not a key conflict.
  const caseKey = randomUUID();
  const venue = await added(
    matterA,
    { purpose: 'venue', jurisdiction: 'NY', forumId: nyCourt.id },
    0,
    caseKey,
  );
  const retried = await added(
    matterA.toUpperCase(),
    { purpose: 'venue', jurisdiction: 'NY', forumId: nyCourt.id.toUpperCase() },
    0,
    caseKey,
  );
  expect(retried.commandId).toBe(venue.commandId);
  await added(matterA, { purpose: 'other', jurisdiction: 'NY', label: 'Arbitration seat' });
  const list = await references(matterA, 1);
  expect(list.canManage).toBe(true);
  expect(list.items.map((r) => [r.purpose, r.jurisdiction, r.docketNumber])).toEqual([
    ['governing_law', 'DE', null],
    ['agency', 'CA', 'ADJ-123456'],
    ['venue', 'US', '1:26-cv-04410'],
    ['venue', 'NY', null],
    ['other', 'NY', null],
  ]);
  const [audit] = await sql`select action,record_type,record_id,before,after from audit_logs
    where firm_id=${firm} and command_id=${agency.commandId}`;
  expect(audit).toEqual({
    action: 'matter.jurisdiction.add.v1',
    record_type: 'matter',
    record_id: matterA,
    before: {},
    after: {
      referenceId: agency.reference.id,
      purpose: 'agency',
      jurisdiction: 'CA',
      forumId: caAgency.id,
    },
  });
  const stored = await sql`select response::text as response from command_receipts
    where firm_id=${firm} and command like 'matter.jurisdiction.%'`;
  for (const row of stored) {
    expect(row.response).not.toContain('ADJ-123456');
    expect(row.response).not.toContain('Arbitration seat');
  }
  const logged = await sql`select (before::text || after::text) as text from audit_logs
    where firm_id=${firm} and action like 'matter.jurisdiction.%'`;
  for (const row of logged) {
    expect(row.text).not.toContain('1:26-cv-04410');
    expect(row.text).not.toContain('Arbitration seat');
  }
});

it('refuses a forum from another jurisdiction or firm, an archived forum and a duplicate reference', async () => {
  const mismatch = await api('POST', `/matters/${matterA}/jurisdictions`, 0, {
    purpose: 'venue',
    jurisdiction: 'CA',
    forumId: nyCourt.id,
  });
  expect(mismatch.status).toBe(422);
  expect(await code(mismatch)).toBe('FORUM_JURISDICTION_MISMATCH');
  const foreign = await api('POST', `/matters/${matterA}/jurisdictions`, 0, {
    purpose: 'agency',
    jurisdiction: 'CA',
    forumId: foreignForum.id,
  });
  expect(foreign.status).toBe(404);
  expect(await code(foreign)).toBe('FORUM_UNAVAILABLE');
  const duplicate = await api('POST', `/matters/${matterA}/jurisdictions`, 0, {
    purpose: 'venue',
    jurisdiction: 'NY',
    forumId: nyCourt.id,
  });
  expect(duplicate.status).toBe(409);
  expect(await code(duplicate)).toBe('REFERENCE_EXISTS');
  // Concurrent identical intents under different keys: the current-reference index decides.
  const body = { purpose: 'governing_law', jurisdiction: 'TX' };
  const raced = await Promise.all([
    api('POST', `/matters/${matterA}/jurisdictions`, 0, body),
    api('POST', `/matters/${matterA}/jurisdictions`, 1, body),
  ]);
  expect(raced.map((r) => r.status).sort()).toEqual([201, 409]);

  await parse(
    forumResultSchema,
    await api('PATCH', `/forums/${nyCourt.id}`, 0, { expectedRevision: 2, archived: true }),
  );
  const archived = await api('POST', `/matters/${matterB}/jurisdictions`, 0, {
    purpose: 'venue',
    jurisdiction: 'NY',
    forumId: nyCourt.id,
  });
  expect(archived.status).toBe(409);
  expect(await code(archived)).toBe('FORUM_ARCHIVED');
  const existing = (await references(matterA)).items.find((r) => r.forum?.id === nyCourt.id);
  expect(existing?.forum).toMatchObject({ name: nyCourt.name, archived: true });
  expect((await forums('?status=archived')).items.map((f) => f.id)).toEqual([nyCourt.id]);
});

it('ends references for managers with an editing role and keeps them as history', async () => {
  const target = (await references(matterA)).items.find((r) => r.purpose === 'other')!;
  for (const index of [2, 5, 6]) {
    const refused = await api('POST', `/matters/${matterA}/jurisdiction-endings`, index, {
      referenceId: target.id,
    });
    expect(refused.status).toBe(403);
    expect(await code(refused)).toBe('MATTER_JURISDICTION_MANAGEMENT_DENIED');
  }
  const refusedAdd = await api('POST', `/matters/${matterA}/jurisdictions`, 5, {
    purpose: 'governing_law',
    jurisdiction: 'WA',
  });
  expect(refusedAdd.status).toBe(403);
  const key = randomUUID();
  const ended = await parse(
    matterJurisdictionResultSchema,
    await api(
      'POST',
      `/matters/${matterA}/jurisdiction-endings`,
      1,
      { referenceId: target.id },
      key,
    ),
  );
  expect(ended.reference.endedAt).not.toBeNull();
  const replay = await parse(
    matterJurisdictionResultSchema,
    await api(
      'POST',
      `/matters/${matterA}/jurisdiction-endings`,
      1,
      { referenceId: target.id },
      key,
    ),
  );
  expect(replay).toEqual(ended);
  const again = await api('POST', `/matters/${matterA}/jurisdiction-endings`, 0, {
    referenceId: target.id,
  });
  expect(again.status).toBe(409);
  expect(await code(again)).toBe('REFERENCE_ENDED');
  expect((await references(matterA)).items.some((r) => r.id === target.id)).toBe(false);
  expect(
    await count(sql`select count(*)::int as n from matter_jurisdictions
      where id=${target.id} and deleted_at is not null`),
  ).toBe(1);
  // An ended reference can be added again as a new current reference.
  const readded = await added(matterA, {
    purpose: 'other',
    jurisdiction: 'NY',
    label: 'Arbitration seat',
  });
  expect(readded.reference.id).not.toBe(target.id);
  const [audit] = await sql`select before,after from audit_logs
    where firm_id=${firm} and command_id=${ended.commandId}`;
  expect(audit).toEqual({
    before: { referenceId: target.id, purpose: 'other', jurisdiction: 'NY', endedAt: null },
    after: {
      referenceId: target.id,
      purpose: 'other',
      jurisdiction: 'NY',
      endedAt: ended.reference.endedAt,
    },
  });
});

it('hides references and docket numbers without a matter grant or across firms', async () => {
  const reader = await references(matterA, 2);
  expect(reader.canManage).toBe(false);
  expect(reader.items.some((r) => r.docketNumber === '1:26-cv-04410')).toBe(true);
  for (const [matter, index] of [
    [matterA, 4],
    [matterB, 1],
    [matterA, 3],
    [foreignMatter, 0],
  ] as const) {
    const hidden = await api('GET', `/matters/${matter}/jurisdictions`, index);
    expect(hidden.status).toBe(404);
    expect(await code(hidden)).toBe('MATTER_UNAVAILABLE');
    const write = await api('POST', `/matters/${matter}/jurisdictions`, index, {
      purpose: 'governing_law',
      jurisdiction: 'OR',
    });
    expect(write.status).toBe(404);
  }
  const anyId = (await references(matterA)).items[0]!.id;
  const crossEnd = await api('POST', `/matters/${matterB}/jurisdiction-endings`, 0, {
    referenceId: anyId,
  });
  expect(crossEnd.status).toBe(404);
  expect(await code(crossEnd)).toBe('REFERENCE_UNAVAILABLE');
});

it('caps current references per matter', async () => {
  await sql`insert into matter_jurisdictions(firm_id,matter_id,purpose,jurisdiction,docket_number,created_by)
    select ${firm},${matterB},'venue','US','cap-' || n,${users[0]!} from generate_series(1,50) n`;
  const over = await api('POST', `/matters/${matterB}/jurisdictions`, 0, {
    purpose: 'governing_law',
    jurisdiction: 'VT',
  });
  expect(over.status).toBe(409);
  expect(await code(over)).toBe('REFERENCE_LIMIT');
  expect((await references(matterB)).items).toHaveLength(50);
});
