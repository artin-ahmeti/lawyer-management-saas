import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  createMatterResultSchema,
  matterFieldsResultSchema,
  matterFieldsSchema,
  matterSchema,
  practiceProfileDetailSchema,
  practiceProfileListSchema,
  practiceProfileResultSchema,
  practiceStarters,
  type PracticeFieldDefinition,
  type PracticeProfileRecord,
} from '@lawfirm/core';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local DB required');
const sql = postgres(url, { max: 3 });
const firm = randomUUID(),
  otherFirm = randomUUID();
// 0 owner, 1 admin, 2 attorney, 3 paralegal, 4 billing, 5 readonly, 6 other-firm owner.
const roles = ['owner', 'admin', 'attorney', 'paralegal', 'billing', 'readonly', 'owner'];
const users = roles.map(() => randomUUID());
const sessions = users.map(() => randomUUID());
const firmOf = (index: number) => (index === 6 ? otherFirm : firm);
let app: INestApplication, base: string;

async function token(index: number) {
  return new SignJWT({
    role: 'authenticated',
    firm_id: firmOf(index),
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
const count = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n;
async function profile(index: number, body: Record<string, unknown>) {
  const response = await api('POST', '/practice-profiles', index, body);
  expect(response.status).toBe(201);
  return (await parse(practiceProfileResultSchema, response)).profile;
}
async function matter(index: number, body: Record<string, unknown>) {
  const response = await api('POST', '/matters', index, body);
  expect(response.status).toBe(201);
  return (await parse(createMatterResultSchema, response)).matter;
}
const grant = (matterId: string, index: number, role: 'reader' | 'manager') =>
  sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by)
    values (${firm},${matterId},${users[index]!},${role},${users[0]!})
    on conflict (firm_id,matter_id,user_id) do update set role=excluded.role,deleted_at=null`;
async function readAs(index: number, query: (tx: postgres.TransactionSql) => Promise<unknown>) {
  return sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    const claims = {
      sub: users[index],
      role: 'authenticated',
      firm_id: firmOf(index),
      session_id: sessions[index],
    };
    await tx`select set_config('request.jwt.claims',${JSON.stringify(claims)},true)`;
    return query(tx);
  });
}

const dealFields: PracticeFieldDefinition[] = [
  { key: 'entity_name', label: 'Entity', type: 'text', required: true },
  { key: 'scope', label: 'Scope', type: 'long_text', required: false },
  { key: 'share_count', label: 'Share count', type: 'number', required: false },
  { key: 'target_close', label: 'Target completion', type: 'date', required: false },
  { key: 'board_approved', label: 'Board approved', type: 'yes_no', required: false },
  {
    key: 'structure',
    label: 'Structure',
    type: 'choice',
    required: false,
    options: ['Asset purchase', 'Share purchase'],
    help: 'How ownership transfers.',
  },
];

beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const [i, user] of users.entries()) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@profile.test`},now(),'{}'::jsonb)`;
    await sql`insert into auth.sessions(id,user_id) values (${sessions[i]!},${user})`;
  }
  await sql`insert into firms(id,name) values (${firm},'Profile test firm'),(${otherFirm},'Other profile firm')`;
  for (const [i, user] of users.entries())
    await sql`insert into firm_members(firm_id,user_id,role) values (${firmOf(i)},${user},${roles[i]!})`;
  app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  const [exists] = await sql`select to_regclass('public.practice_profiles') is not null as present`;
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role=replica`;
    await tx`delete from audit_logs where firm_id in (${firm},${otherFirm})`;
    await tx`delete from command_receipts where firm_id in (${firm},${otherFirm})`;
    await tx`delete from matter_access where firm_id in (${firm},${otherFirm})`;
    await tx`delete from matters where firm_id in (${firm},${otherFirm})`;
    if (exists?.present) {
      await tx`delete from practice_profile_versions where firm_id in (${firm},${otherFirm})`;
      await tx`delete from practice_profiles where firm_id in (${firm},${otherFirm})`;
    }
  });
  await sql`delete from firm_members where firm_id in (${firm},${otherFirm})`;
  await sql`delete from firms where id in (${firm},${otherFirm})`;
  for (const user of users) await sql`delete from auth.users where id=${user}`;
  await sql.end();
});

let deals: PracticeProfileRecord, foreignProfile: PracticeProfileRecord;
let dealMatter: string;

it('publishes a custom profile with every field type once under concurrent identical requests', async () => {
  const key = randomUUID();
  const input = {
    name: '  Mergers and acquisitions ',
    description: 'Buy-side and sell-side deals.',
    fields: dealFields,
  };
  const responses = await Promise.all([
    api('POST', '/practice-profiles', 0, input, key),
    api('POST', '/practice-profiles', 0, input, key),
  ]);
  expect(responses.map((r) => r.status)).toEqual([201, 201]);
  const [first, replay] = await Promise.all(
    responses.map((r) => parse(practiceProfileResultSchema, r)),
  );
  expect(replay).toEqual(first);
  deals = first!.profile;
  expect(deals).toMatchObject({
    firmId: firm,
    name: 'Mergers and acquisitions',
    description: 'Buy-side and sell-side deals.',
    basedOn: null,
    archived: false,
    revision: 1,
    currentVersion: { version: 1, fields: dealFields },
  });
  expect(
    await count(sql`select count(*)::int as n from practice_profiles where firm_id=${firm}`),
  ).toBe(1);
  const [audit] = await sql`select action,record_type,record_id,after from audit_logs
    where firm_id=${firm} and action='practice_profile.create.v1'`;
  expect(audit).toMatchObject({ record_type: 'practice_profile', record_id: deals.id });
  expect(audit!.after).toMatchObject({
    name: 'Mergers and acquisitions',
    version: 1,
    fieldKeys: dealFields.map((f) => f.key),
  });
  const [receipt] = await sql`select response from command_receipts
    where firm_id=${firm} and command='practice_profile.create.v1'`;
  expect(receipt!.response).toEqual({ profile: { id: deals.id }, commandId: first!.commandId });
});

it('lets owners and admins manage profiles while every live staff role reads them', async () => {
  const admin = await profile(1, {
    name: 'Corporate advisory',
    basedOn: { key: 'corporate_transactional', version: 1 },
    fields: practiceStarters.corporate_transactional.fields,
  });
  expect(admin.basedOn).toEqual({ key: 'corporate_transactional', version: 1 });
  for (const index of [2, 3, 4, 5]) {
    const denied = await api('POST', '/practice-profiles', index, {
      name: `R${index}`,
      fields: [],
    });
    expect(denied.status).toBe(403);
    expect(await code(denied)).toBe('CAPABILITY_DENIED');
    const list = await get(practiceProfileListSchema, '/practice-profiles', index);
    expect(list.canManage).toBe(false);
    expect(list.items.map((p) => p.name)).toEqual([
      'Corporate advisory',
      'Mergers and acquisitions',
    ]);
    const detail = await get(practiceProfileDetailSchema, `/practice-profiles/${deals.id}`, index);
    expect(detail.profile.currentVersion.fields).toEqual(dealFields);
  }
  for (const index of [0, 1])
    expect((await get(practiceProfileListSchema, '/practice-profiles', index)).canManage).toBe(
      true,
    );
  expect(
    (await get(practiceProfileListSchema, '/practice-profiles', 0)).items.find(
      (p) => p.id === deals.id,
    ),
  ).toMatchObject({ currentVersion: 1, fieldCount: 6 });

  foreignProfile = await profile(6, { name: 'Mergers and acquisitions', fields: [] });
  expect((await get(practiceProfileListSchema, '/practice-profiles', 6)).items).toHaveLength(1);
  const foreign = await api('GET', `/practice-profiles/${foreignProfile.id}`, 0);
  expect(foreign.status).toBe(404);
  expect(await code(foreign)).toBe('PROFILE_UNAVAILABLE');
  const foreignRevise = await api('PATCH', `/practice-profiles/${foreignProfile.id}`, 0, {
    expectedRevision: 1,
    name: 'Taken',
  });
  expect(foreignRevise.status).toBe(404);
});

it('refuses invalid field sets, unknown starters and duplicate active names', async () => {
  const text = { key: 'a', label: 'A', type: 'text', required: false };
  for (const body of [
    { name: 'Dup keys', fields: [text, text] },
    { name: 'Bad type', fields: [{ ...text, type: 'money' }] },
    { name: 'Bad starter', basedOn: { key: 'tax_court', version: 1 }, fields: [] },
    { name: 'Authority', fields: [], firmId: otherFirm },
  ]) {
    const response = await api('POST', '/practice-profiles', 0, body);
    expect(response.status).toBe(422);
  }
  const future = await api('POST', '/practice-profiles', 0, {
    name: 'Future starter',
    basedOn: { key: 'family', version: 99 },
    fields: [],
  });
  expect(future.status).toBe(422);
  expect(await code(future)).toBe('STARTER_UNAVAILABLE');
  const taken = await api('POST', '/practice-profiles', 1, {
    name: 'MERGERS AND ACQUISITIONS',
    fields: [],
  });
  expect(taken.status).toBe(409);
  expect(await code(taken)).toBe('PROFILE_NAME_TAKEN');
});

it('creates transactional and advisory matters with typed values and no court field', async () => {
  const created = await matter(0, {
    title: 'Northwind acquisition',
    profileVersionId: deals.currentVersion.id,
    fieldValues: {
      entity_name: ' Northwind Holdings ',
      share_count: 1200,
      target_close: '2026-12-15',
      board_approved: true,
      structure: 'Share purchase',
    },
  });
  dealMatter = created.id;
  expect(created.profile).toEqual({ id: deals.id, name: 'Mergers and acquisitions', version: 1 });
  const fields = await get(matterFieldsSchema, `/matters/${dealMatter}/fields`);
  expect(fields).toMatchObject({
    matterId: dealMatter,
    revision: 1,
    canEdit: true,
    profile: { id: deals.id, archived: false, version: { version: 1, fields: dealFields } },
    values: {
      entity_name: 'Northwind Holdings',
      share_count: 1200,
      target_close: '2026-12-15',
      board_approved: true,
      structure: 'Share purchase',
    },
  });
  expect(fields.profile!.version.fields.map((f) => f.key)).not.toContain('court');
  const [audit] = await sql`select after from audit_logs
    where firm_id=${firm} and action='matter.create.v1' and record_id=${dealMatter}`;
  expect(audit!.after).toMatchObject({ profileVersionId: deals.currentVersion.id });
  expect(JSON.stringify(audit!.after)).not.toContain('Northwind Holdings');

  const advisory = await get(practiceProfileListSchema, '/practice-profiles');
  const corporate = advisory.items.find((p) => p.name === 'Corporate advisory')!;
  const detail = await get(practiceProfileDetailSchema, `/practice-profiles/${corporate.id}`);
  const plain = await matter(2, {
    title: 'Board governance advice',
    profileVersionId: detail.profile.currentVersion.id,
  });
  expect(plain.profile).toMatchObject({ name: 'Corporate advisory', version: 1 });
  expect((await get(matterFieldsSchema, `/matters/${plain.id}/fields`, 2)).values).toEqual({});
});

it('refuses values that do not match the pinned version without creating a matter', async () => {
  const before = await count(sql`select count(*)::int as n from matters where firm_id=${firm}`);
  for (const fieldValues of [
    { entity_name: 'A', court: 'Superior Court' },
    { entity_name: 'A', share_count: '1200' },
    { entity_name: 'A', target_close: '2026-02-30' },
    { entity_name: 'A', structure: 'Merger' },
    { scope: 'Missing the required entity' },
  ]) {
    const response = await api('POST', '/matters', 0, {
      title: 'Invalid values',
      profileVersionId: deals.currentVersion.id,
      fieldValues,
    });
    expect(response.status).toBe(422);
    expect(await code(response)).toBe('FIELD_VALUES_INVALID');
  }
  const foreign = await api('POST', '/matters', 0, {
    title: 'Foreign profile',
    profileVersionId: foreignProfile.currentVersion.id,
  });
  expect(foreign.status).toBe(404);
  expect(await code(foreign)).toBe('PROFILE_UNAVAILABLE');
  const orphan = await api('POST', '/matters', 0, {
    title: 'Orphan values',
    fieldValues: { a: 1 },
  });
  expect(orphan.status).toBe(422);
  expect(await count(sql`select count(*)::int as n from matters where firm_id=${firm}`)).toBe(
    before,
  );
});

it('publishes a new version on field revision while existing matters keep theirs', async () => {
  const renamed = await api('PATCH', `/practice-profiles/${deals.id}`, 0, {
    expectedRevision: 1,
    name: 'M&A',
  });
  const afterName = (await parse(practiceProfileResultSchema, renamed)).profile;
  expect(afterName).toMatchObject({ name: 'M&A', revision: 2, currentVersion: { version: 1 } });

  const stale = await api('PATCH', `/practice-profiles/${deals.id}`, 0, {
    expectedRevision: 1,
    name: 'Stale',
  });
  expect(stale.status).toBe(409);
  expect(await code(stale)).toBe('PROFILE_CHANGED');
  const same = await api('PATCH', `/practice-profiles/${deals.id}`, 0, {
    expectedRevision: 2,
    name: 'M&A',
    fields: dealFields,
  });
  expect(same.status).toBe(409);
  expect(await code(same)).toBe('PROFILE_UNCHANGED');

  const v2Fields: PracticeFieldDefinition[] = [
    ...dealFields.filter((f) => f.key !== 'share_count'),
    { key: 'regulator_filing', label: 'Regulatory filing needed', type: 'yes_no', required: true },
  ];
  const revised = (
    await parse(
      practiceProfileResultSchema,
      await api('PATCH', `/practice-profiles/${deals.id}`, 1, {
        expectedRevision: 2,
        fields: v2Fields,
      }),
    )
  ).profile;
  expect(revised).toMatchObject({ revision: 3, currentVersion: { version: 2, fields: v2Fields } });
  expect(revised.currentVersion.id).not.toBe(deals.currentVersion.id);

  const kept = await get(matterFieldsSchema, `/matters/${dealMatter}/fields`);
  expect(kept.profile).toMatchObject({ name: 'M&A', version: { version: 1, fields: dealFields } });
  expect(kept.values.share_count).toBe(1200);
  expect((await get(matterSchema, `/matters/${dealMatter}`)).profile).toMatchObject({ version: 1 });

  const outdated = await api('POST', '/matters', 0, {
    title: 'Form loaded before the revision',
    profileVersionId: deals.currentVersion.id,
    fieldValues: { entity_name: 'Contoso' },
  });
  expect(outdated.status).toBe(409);
  expect(await code(outdated)).toBe('PROFILE_CHANGED');
  const current = await matter(0, {
    title: 'Contoso merger',
    profileVersionId: revised.currentVersion.id,
    fieldValues: { entity_name: 'Contoso', regulator_filing: false },
  });
  expect(current.profile).toMatchObject({ version: 2 });
  deals = revised;
});

it('edits matter values against the reviewed revision exactly once with keys, not values, in history', async () => {
  const [left, right] = await Promise.all([
    api('PATCH', `/matters/${dealMatter}/fields`, 0, {
      expectedRevision: 1,
      values: { scope: 'Diligence on the distributor network.' },
    }),
    api('PATCH', `/matters/${dealMatter}/fields`, 0, {
      expectedRevision: 1,
      values: { board_approved: false },
    }),
  ]);
  expect([left.status, right.status].sort()).toEqual([200, 409]);
  const loser = left.status === 409 ? left : right;
  expect(await code(loser)).toBe('MATTER_CHANGED');
  const winner = await get(matterFieldsSchema, `/matters/${dealMatter}/fields`);
  expect(winner.revision).toBe(2);

  const key = randomUUID();
  const body = { expectedRevision: 2, values: { share_count: null, structure: 'Asset purchase' } };
  const first = await parse(
    matterFieldsResultSchema,
    await api('PATCH', `/matters/${dealMatter}/fields`, 0, body, key),
  );
  expect(first.fields.revision).toBe(3);
  expect(first.fields.values.share_count).toBeUndefined();
  expect(first.fields.values.structure).toBe('Asset purchase');
  const replay = await parse(
    matterFieldsResultSchema,
    await api('PATCH', `/matters/${dealMatter}/fields`, 0, body, key),
  );
  expect(replay).toEqual(first);
  const reused = await api(
    'PATCH',
    `/matters/${dealMatter}/fields`,
    0,
    { ...body, values: {} },
    key,
  );
  expect(reused.status).toBe(409);
  expect(await code(reused)).toBe('IDEMPOTENCY_CONFLICT');

  const unchanged = await api('PATCH', `/matters/${dealMatter}/fields`, 0, {
    expectedRevision: 3,
    values: { structure: 'Asset purchase' },
  });
  expect(unchanged.status).toBe(409);
  expect(await code(unchanged)).toBe('MATTER_FIELDS_UNCHANGED');
  const invalid = await api('PATCH', `/matters/${dealMatter}/fields`, 0, {
    expectedRevision: 3,
    values: { entity_name: null },
  });
  expect(invalid.status).toBe(422);
  expect(await code(invalid)).toBe('FIELD_VALUES_INVALID');

  const audits = await sql`select before,after from audit_logs
    where firm_id=${firm} and action='matter.fields.update.v1' and record_id=${dealMatter}
    order by created_at`;
  expect(audits).toHaveLength(2);
  expect(audits[1]!.after).toMatchObject({ revision: 3, changed: ['share_count', 'structure'] });
  expect(JSON.stringify(audits)).not.toContain('Asset purchase');
  const receipts = await sql`select response from command_receipts
    where firm_id=${firm} and command='matter.fields.update.v1'`;
  expect(JSON.stringify(receipts)).not.toContain('Asset purchase');
  expect((await sql`select revision,title from matters where id=${dealMatter}`)[0]).toEqual({
    revision: 3,
    title: 'Northwind acquisition',
  });
});

it('requires a manager grant and an editing role to change values', async () => {
  const hidden = await api('GET', `/matters/${dealMatter}/fields`, 2);
  expect(hidden.status).toBe(404);
  expect(await code(hidden)).toBe('MATTER_UNAVAILABLE');
  await grant(dealMatter, 3, 'reader');
  const reader = await get(matterFieldsSchema, `/matters/${dealMatter}/fields`, 3);
  expect(reader.canEdit).toBe(false);
  const denied = await api('PATCH', `/matters/${dealMatter}/fields`, 3, {
    expectedRevision: reader.revision,
    values: { scope: 'Reader edit' },
  });
  expect(denied.status).toBe(403);
  expect(await code(denied)).toBe('MATTER_FIELDS_DENIED');
  await grant(dealMatter, 3, 'manager');
  const paralegal = await parse(
    matterFieldsResultSchema,
    await api('PATCH', `/matters/${dealMatter}/fields`, 3, {
      expectedRevision: reader.revision,
      values: { scope: 'Paralegal update' },
    }),
  );
  expect(paralegal.fields.canEdit).toBe(true);
  for (const index of [4, 5]) {
    await grant(dealMatter, index, 'manager');
    const view = await get(matterFieldsSchema, `/matters/${dealMatter}/fields`, index);
    expect(view.canEdit).toBe(false);
    const refused = await api('PATCH', `/matters/${dealMatter}/fields`, index, {
      expectedRevision: view.revision,
      values: { scope: 'Not allowed' },
    });
    expect(refused.status).toBe(403);
  }
  const foreign = await api('GET', `/matters/${dealMatter}/fields`, 6);
  expect(foreign.status).toBe(404);
});

it('assigns a profile once to a matter created without one', async () => {
  const bare = await matter(0, { title: 'Profile-less matter' });
  expect(bare.profile).toBeNull();
  const empty = await get(matterFieldsSchema, `/matters/${bare.id}/fields`);
  expect(empty).toMatchObject({ profile: null, values: {}, revision: 1 });
  const needsProfile = await api('PATCH', `/matters/${bare.id}/fields`, 0, {
    expectedRevision: 1,
    values: { entity_name: 'X' },
  });
  expect(needsProfile.status).toBe(409);
  expect(await code(needsProfile)).toBe('PROFILE_REQUIRED');
  const assigned = await parse(
    matterFieldsResultSchema,
    await api('PATCH', `/matters/${bare.id}/fields`, 0, {
      expectedRevision: 1,
      profileVersionId: deals.currentVersion.id,
      values: { entity_name: 'Fabrikam', regulator_filing: true },
    }),
  );
  expect(assigned.fields).toMatchObject({
    revision: 2,
    profile: { id: deals.id, version: { version: 2 } },
    values: { entity_name: 'Fabrikam', regulator_filing: true },
  });
  const advisory = (await get(practiceProfileListSchema, '/practice-profiles')).items.find(
    (p) => p.name === 'Corporate advisory',
  )!;
  const other = await get(practiceProfileDetailSchema, `/practice-profiles/${advisory.id}`);
  const repin = await api('PATCH', `/matters/${bare.id}/fields`, 0, {
    expectedRevision: 2,
    profileVersionId: other.profile.currentVersion.id,
    values: {},
  });
  expect(repin.status).toBe(409);
  expect(await code(repin)).toBe('PROFILE_PINNED');
  const [audit] = await sql`select after from audit_logs where firm_id=${firm}
    and action='matter.fields.update.v1' and record_id=${bare.id}`;
  expect(audit!.after).toMatchObject({ profileVersionId: deals.currentVersion.id });
});

it('archives a profile for new work while existing matters keep showing and editing it', async () => {
  const archived = (
    await parse(
      practiceProfileResultSchema,
      await api('PATCH', `/practice-profiles/${deals.id}`, 0, {
        expectedRevision: deals.revision,
        archived: true,
      }),
    )
  ).profile;
  expect(archived).toMatchObject({ archived: true, currentVersion: { version: 2 } });
  const active = await get(practiceProfileListSchema, '/practice-profiles');
  expect(active.items.map((p) => p.id)).not.toContain(deals.id);
  const shelf = await get(practiceProfileListSchema, '/practice-profiles?status=archived');
  expect(shelf.items.map((p) => p.id)).toEqual([deals.id]);

  const refused = await api('POST', '/matters', 0, {
    title: 'Archived profile',
    profileVersionId: deals.currentVersion.id,
    fieldValues: { entity_name: 'A', regulator_filing: true },
  });
  expect(refused.status).toBe(409);
  expect(await code(refused)).toBe('PROFILE_ARCHIVED');
  const bare = await matter(0, { title: 'Second profile-less matter' });
  const assign = await api('PATCH', `/matters/${bare.id}/fields`, 0, {
    expectedRevision: 1,
    profileVersionId: deals.currentVersion.id,
    values: { entity_name: 'A', regulator_filing: true },
  });
  expect(assign.status).toBe(409);
  expect(await code(assign)).toBe('PROFILE_ARCHIVED');

  const existing = await get(matterFieldsSchema, `/matters/${dealMatter}/fields`);
  expect(existing.profile).toMatchObject({ archived: true, version: { version: 1 } });
  await parse(
    matterFieldsResultSchema,
    await api('PATCH', `/matters/${dealMatter}/fields`, 0, {
      expectedRevision: existing.revision,
      values: { scope: 'Still editable after archiving' },
    }),
  );
  const restored = (
    await parse(
      practiceProfileResultSchema,
      await api('PATCH', `/practice-profiles/${deals.id}`, 0, {
        expectedRevision: archived.revision,
        archived: false,
      }),
    )
  ).profile;
  expect(restored.archived).toBe(false);
  deals = restored;
});

it('refuses unstorable text before the database and replays a reordered retry', async () => {
  const before = await get(matterFieldsSchema, `/matters/${dealMatter}/fields`);
  const nul = await api('PATCH', `/matters/${dealMatter}/fields`, 0, {
    expectedRevision: before.revision,
    values: { scope: 'Client SSN 123-45-6789 \u0000 pasted' },
  });
  expect(nul.status).toBe(422);
  const surrogate = await api('POST', '/practice-profiles', 0, {
    name: 'Deals \ud800',
    fields: [],
  });
  expect(surrogate.status).toBe(422);
  const current = await get(matterFieldsSchema, `/matters/${dealMatter}/fields`);
  const key = randomUUID();
  const first = await api(
    'PATCH',
    `/matters/${dealMatter}/fields`,
    0,
    { expectedRevision: current.revision, values: { scope: 'Reordered', board_approved: true } },
    key,
  );
  expect(first.status).toBe(200);
  const retry = await api(
    'PATCH',
    `/matters/${dealMatter}/fields`,
    0,
    { values: { board_approved: true, scope: 'Reordered' }, expectedRevision: current.revision },
    key,
  );
  expect(retry.status).toBe(200);
  expect(await retry.json()).toEqual(await first.json());
});

it('replays a committed create after its starter version changes', async () => {
  const key = randomUUID();
  const body = {
    name: 'Family starter replay',
    basedOn: { key: 'family', version: 1 },
    fields: practiceStarters.family.fields,
  };
  const first = await parse(
    practiceProfileResultSchema,
    await api('POST', '/practice-profiles', 0, body, key),
  );
  const released = practiceStarters.family.version;
  practiceStarters.family.version = released + 1;
  try {
    const replay = await api('POST', '/practice-profiles', 0, body, key);
    expect(replay.status).toBe(201);
    expect(practiceProfileResultSchema.parse(await replay.json())).toEqual(first);
    // New work against the old starter version is refused.
    const fresh = await api('POST', '/practice-profiles', 0, { ...body, name: 'Family again' });
    expect(fresh.status).toBe(422);
    expect(await code(fresh)).toBe('STARTER_UNAVAILABLE');
  } finally {
    practiceStarters.family.version = released;
  }
});

it('refuses a body over the transport limit as final, not as a retryable failure', async () => {
  const response = await api('POST', '/practice-profiles', 0, {
    name: 'Oversized',
    fields: [],
    padding: 'x'.repeat(150_000),
  });
  expect(response.status).toBe(413);
  expect(await code(response)).toBe('PAYLOAD_TOO_LARGE');
  const malformed = await fetch(`${base}/practice-profiles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await token(0)}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
    },
    body: '{"name":',
  });
  expect(malformed.status).toBe(400);
});

it('replays a matter creation recorded before practice profiles existed', async () => {
  const key = randomUUID();
  const created = await parse(
    createMatterResultSchema,
    await api('POST', '/matters', 0, { title: 'Pre-profile matter' }, key),
  );
  await sql`update command_receipts set response = response #- '{matter,profile}'
    where firm_id=${firm} and command='matter.create.v1' and idempotency_key=${key}`;
  const replay = await parse(
    createMatterResultSchema,
    await api('POST', '/matters', 0, { title: 'Pre-profile matter' }, key),
  );
  expect(replay).toEqual(created);
  expect(replay.matter.profile).toBeNull();
});

it('enforces tenant and wall rules for authenticated SQL reads', async () => {
  const profilesFor = (index: number) =>
    readAs(
      index,
      (tx) =>
        tx`select id from practice_profiles where id in (${deals.id},${foreignProfile.id}) order by id`,
    );
  expect(await profilesFor(5)).toEqual([{ id: deals.id }]);
  expect(await profilesFor(6)).toEqual([{ id: foreignProfile.id }]);
  const versionsFor = (index: number) =>
    readAs(
      index,
      (tx) =>
        tx`select count(*)::int as n from practice_profile_versions where profile_id=${deals.id}`,
    );
  expect(await versionsFor(4)).toEqual([{ n: 2 }]);
  expect(await versionsFor(6)).toEqual([{ n: 0 }]);
  const valuesFor = (index: number) =>
    readAs(index, (tx) => tx`select field_values from matters where id=${dealMatter}`);
  expect(await valuesFor(0)).toHaveLength(1);
  expect(await valuesFor(2)).toEqual([]);
  await expect(
    readAs(
      0,
      (tx) =>
        tx`insert into practice_profiles(firm_id,name,created_by) values (${firm},'Client write',${users[0]!})`,
    ),
  ).rejects.toMatchObject({ code: '42501' });
  await expect(
    readAs(0, (tx) => tx`update matters set field_values='{}'::jsonb where id=${dealMatter}`),
  ).rejects.toMatchObject({ code: '42501' });
  await expect(
    sql`update practice_profile_versions set fields='[]'::jsonb where profile_id=${deals.id}`,
  ).rejects.toMatchObject({ code: '42501' });
  // A pinned version never changes; an unpinned matter cannot borrow another firm's version.
  await expect(
    sql`update matters set profile_version_id=null,field_values='{}'::jsonb where id=${dealMatter}`,
  ).rejects.toMatchObject({ code: '42501' });
  await expect(
    sql`update matters set profile_version_id=${foreignProfile.currentVersion.id}
      where firm_id=${firm} and title='Second profile-less matter'`,
  ).rejects.toMatchObject({ code: '23503' });
});
