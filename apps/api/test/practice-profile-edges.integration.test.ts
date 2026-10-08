import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  createMatterResultSchema,
  matterFieldsResultSchema,
  matterFieldsSchema,
  matterSchema,
  practiceProfileDetailSchema,
  practiceProfileListSchema,
  practiceProfileResultSchema,
  type PracticeFieldDefinition,
  type PracticeProfileRecord,
} from '@lawfirm/core';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

/**
 * Edge cases of the D022 contract that the main practice-profile suite does not reach:
 * each authorization condition alone, replays after access changes, restore conflicts and
 * keyset paging past one page. Every test builds its own profiles and matters.
 */
const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local DB required');
const sql = postgres(url, { max: 3 });
const firm = randomUUID(),
  otherFirm = randomUUID(),
  pagingFirm = randomUUID();
const firms = [firm, otherFirm, pagingFirm];
const members = [
  { role: 'owner', firm }, // 0
  { role: 'admin', firm }, // 1
  { role: 'attorney', firm }, // 2
  { role: 'paralegal', firm }, // 3
  { role: 'billing', firm }, // 4
  { role: 'readonly', firm }, // 5
  { role: 'owner', firm: otherFirm }, // 6
  { role: 'attorney', firm }, // 7 second attorney
  { role: 'paralegal', firm }, // 8 removable paralegal
  { role: 'owner', firm: pagingFirm }, // 9 paging firm owner
] as const;
const users = members.map(() => randomUUID());
const sessions = users.map(() => randomUUID());
let app: INestApplication, base: string;

async function token(index: number) {
  return new SignJWT({
    role: 'authenticated',
    firm_id: members[index]!.firm,
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
async function refused(response: Promise<Response>, status: number, expected?: string) {
  const r = await response;
  expect(r.status).toBe(status);
  const text = await r.text();
  if (expected) expect((JSON.parse(text) as { code?: string }).code).toBe(expected);
  return text;
}
const get = <T>(schema: z.ZodType<T>, path: string, index = 0) =>
  api('GET', path, index).then((r) => parse(schema, r));
async function profile(index: number, body: Record<string, unknown>) {
  const response = await api('POST', '/practice-profiles', index, body);
  expect(response.status).toBe(201);
  return (await parse(practiceProfileResultSchema, response)).profile;
}
async function revise(index: number, id: string, body: Record<string, unknown>, key?: string) {
  return (
    await parse(
      practiceProfileResultSchema,
      await api('PATCH', `/practice-profiles/${id}`, index, body, key),
    )
  ).profile;
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
const revoke = (matterId: string, index: number) =>
  sql`update matter_access set deleted_at=now() where matter_id=${matterId} and user_id=${users[index]!}`;
const setRole = (index: number, role: string) =>
  sql`update firm_members set role=${role} where firm_id=${members[index]!.firm} and user_id=${users[index]!}`;
async function readAs(index: number, query: (tx: postgres.TransactionSql) => Promise<unknown>) {
  return sql.begin(async (tx) => {
    await tx`set local role authenticated`;
    const claims = {
      sub: users[index],
      role: 'authenticated',
      firm_id: members[index]!.firm,
      session_id: sessions[index],
    };
    await tx`select set_config('request.jwt.claims',${JSON.stringify(claims)},true)`;
    return query(tx);
  });
}
const auditCount = async (recordId: string) =>
  (
    await sql`select count(*)::int as n from audit_logs where firm_id=${firm} and record_id=${recordId}`
  )[0]!.n as number;

const intakeFields: PracticeFieldDefinition[] = [
  { key: 'client_ref', label: 'Client reference', type: 'text', required: true },
  { key: 'notes', label: 'Notes', type: 'long_text', required: false },
  { key: 'urgent', label: 'Urgent', type: 'yes_no', required: false },
];
const optionalFields: PracticeFieldDefinition[] = [
  { key: 'notes', label: 'Notes', type: 'long_text', required: false },
];

beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const [i, user] of users.entries()) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@profile-edges.test`},now(),'{}'::jsonb)`;
    await sql`insert into auth.sessions(id,user_id) values (${sessions[i]!},${user})`;
  }
  await sql`insert into firms(id,name) values (${firm},'Profile edge firm'),
    (${otherFirm},'Other edge firm'),(${pagingFirm},'Paging edge firm')`;
  for (const [i, user] of users.entries())
    await sql`insert into firm_members(firm_id,user_id,role) values (${members[i]!.firm},${user},${members[i]!.role})`;
  app = await NestFactory.create(AppModule, { logger: false });
  configureHttp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
afterAll(async () => {
  await app?.close();
  await sql.begin(async (tx) => {
    await tx`set local session_replication_role=replica`;
    await tx`delete from audit_logs where firm_id in ${tx(firms)}`;
    await tx`delete from command_receipts where firm_id in ${tx(firms)}`;
    await tx`delete from matter_access where firm_id in ${tx(firms)}`;
    await tx`delete from matters where firm_id in ${tx(firms)}`;
    await tx`delete from practice_profile_versions where firm_id in ${tx(firms)}`;
    await tx`delete from practice_profiles where firm_id in ${tx(firms)}`;
  });
  await sql`delete from firm_members where firm_id in ${sql(firms)}`;
  await sql`delete from audit_logs where firm_id in ${sql(firms)}`;
  await sql`delete from firms where id in ${sql(firms)}`;
  for (const user of users) await sql`delete from auth.users where id=${user}`;
  await sql.end();
});

describe('profile administration', () => {
  it('refuses revise, archive and restore from every non-administrator role on its own', async () => {
    const p = await profile(0, { name: 'Edge roles', fields: optionalFields });
    for (const index of [2, 3, 4, 5]) {
      for (const change of [{ name: `Edge roles ${index}` }, { archived: true }])
        await refused(
          api('PATCH', `/practice-profiles/${p.id}`, index, { expectedRevision: 1, ...change }),
          403,
          'CAPABILITY_DENIED',
        );
    }
    const unchanged = await get(practiceProfileDetailSchema, `/practice-profiles/${p.id}`, 5);
    expect(unchanged.profile).toMatchObject({ name: 'Edge roles', revision: 1, archived: false });
    expect(await auditCount(p.id)).toBe(1);

    const archived = await revise(1, p.id, { expectedRevision: 1, archived: true });
    expect(archived).toMatchObject({ archived: true, revision: 2, currentVersion: { version: 1 } });
    // Readers still see an archived profile's detail; restoring is an owner/admin action.
    expect(
      (await get(practiceProfileDetailSchema, `/practice-profiles/${p.id}`, 4)).profile.archived,
    ).toBe(true);
    await refused(
      api('PATCH', `/practice-profiles/${p.id}`, 2, { expectedRevision: 2, archived: false }),
      403,
      'CAPABILITY_DENIED',
    );
    const restored = await revise(0, p.id, { expectedRevision: 2, archived: false });
    expect(restored).toMatchObject({ archived: false, revision: 3 });

    // Another firm's owner cannot read, list, revise or archive it.
    await refused(api('GET', `/practice-profiles/${p.id}`, 6), 404, 'PROFILE_UNAVAILABLE');
    await refused(
      api('PATCH', `/practice-profiles/${p.id}`, 6, { expectedRevision: 3, archived: true }),
      404,
      'PROFILE_UNAVAILABLE',
    );
    for (const status of ['active', 'archived'])
      expect(
        (await get(practiceProfileListSchema, `/practice-profiles?status=${status}`, 6)).items.map(
          (i) => i.id,
        ),
      ).not.toContain(p.id);
    expect(await auditCount(p.id)).toBe(3);
  });

  it('refuses restoring an archived profile whose name an active profile now holds', async () => {
    const old = await profile(0, { name: 'Edge Restore', fields: optionalFields });
    const archived = await revise(0, old.id, { expectedRevision: 1, archived: true });
    // An archived name is free for a new active profile, in any case.
    const successor = await profile(1, { name: 'EDGE restore', fields: [] });
    await refused(
      api('PATCH', `/practice-profiles/${old.id}`, 0, {
        expectedRevision: archived.revision,
        archived: false,
      }),
      409,
      'PROFILE_NAME_TAKEN',
    );
    const still = (await get(practiceProfileDetailSchema, `/practice-profiles/${old.id}`)).profile;
    expect(still).toMatchObject({ archived: true, revision: archived.revision });
    expect(await auditCount(old.id)).toBe(2);
    // Restoring under a new name in one revision succeeds.
    const renamed = await revise(0, old.id, {
      expectedRevision: archived.revision,
      archived: false,
      name: 'Edge Restore (legacy)',
    });
    expect(renamed).toMatchObject({ archived: false, name: 'Edge Restore (legacy)' });
    // Renaming an active profile onto another active name is refused; its own name in a
    // different case is not a conflict.
    await refused(
      api('PATCH', `/practice-profiles/${successor.id}`, 0, {
        expectedRevision: 1,
        name: 'edge restore (LEGACY)',
      }),
      409,
      'PROFILE_NAME_TAKEN',
    );
    expect(
      await revise(0, successor.id, { expectedRevision: 1, name: 'Edge Restore' }),
    ).toMatchObject({ name: 'Edge Restore', revision: 2 });
  });

  it('replays a revision by key, even after later changes, and refuses that key for other intent', async () => {
    const a = await profile(0, { name: 'Edge replay A', fields: optionalFields });
    const b = await profile(0, { name: 'Edge replay B', fields: optionalFields });
    const key = randomUUID();
    const body = { expectedRevision: 1, description: 'First pass' };
    const first = await parse(
      practiceProfileResultSchema,
      await api('PATCH', `/practice-profiles/${a.id}`, 0, body, key),
    );
    expect(first.profile.revision).toBe(2);
    const replay = await parse(
      practiceProfileResultSchema,
      await api('PATCH', `/practice-profiles/${a.id}`, 0, body, key),
    );
    expect(replay).toEqual(first);
    const later = await revise(1, a.id, { expectedRevision: 2, fields: intakeFields });
    // The replay names the original command and shows the profile as it is now.
    const lateReplay = await parse(
      practiceProfileResultSchema,
      await api('PATCH', `/practice-profiles/${a.id}`, 0, body, key),
    );
    expect(lateReplay.commandId).toBe(first.commandId);
    expect(lateReplay.profile).toEqual(later);

    await refused(
      api('PATCH', `/practice-profiles/${a.id}`, 0, { ...body, description: 'Other' }, key),
      409,
      'IDEMPOTENCY_CONFLICT',
    );
    await refused(
      api('PATCH', `/practice-profiles/${b.id}`, 0, body, key),
      409,
      'IDEMPOTENCY_CONFLICT',
    );
    // Another member using the same key is a separate intent.
    expect(
      await revise(1, b.id, { expectedRevision: 1, description: 'First pass' }, key),
    ).toMatchObject({ description: 'First pass', revision: 2 });

    const createKey = randomUUID();
    await parse(
      practiceProfileResultSchema,
      await api('POST', '/practice-profiles', 0, { name: 'Edge replay C', fields: [] }, createKey),
    );
    await refused(
      api('POST', '/practice-profiles', 0, { name: 'Edge replay D', fields: [] }, createKey),
      409,
      'IDEMPOTENCY_CONFLICT',
    );
    expect(await auditCount(a.id)).toBe(3);
    expect(await auditCount(b.id)).toBe(2);
  });

  it('lets one of two racing administrators claim a name or a detail revision', async () => {
    const created = await Promise.all(
      [0, 1].map((index) =>
        api('POST', '/practice-profiles', index, { name: 'Edge race', fields: [] }),
      ),
    );
    expect(created.map((r) => r.status).sort()).toEqual([201, 409]);
    const lost = created.find((r) => r.status === 409)!;
    expect(((await lost.json()) as { code: string }).code).toBe('PROFILE_NAME_TAKEN');
    const winner = await parse(
      practiceProfileResultSchema,
      created.find((r) => r.status === 201)!,
    );
    // Detail revisions keep the current version, so the loser sees the new revision.
    const renamed = await Promise.all(
      ['Edge race one', 'Edge race two'].map((name, index) =>
        api('PATCH', `/practice-profiles/${winner.profile.id}`, index, {
          expectedRevision: 1,
          name,
        }),
      ),
    );
    expect(renamed.map((r) => r.status).sort()).toEqual([200, 409]);
    const stale = renamed.find((r) => r.status === 409)!;
    expect(((await stale.json()) as { code: string }).code).toBe('PROFILE_CHANGED');
    expect(await auditCount(winner.profile.id)).toBe(2);
  });

  it('answers a field revision that waited behind another with PROFILE_CHANGED, not 404', async () => {
    const raced = await profile(0, { name: 'Edge field race', fields: [] });
    for (let round = 0; round < 3; round++) {
      const current = await get(practiceProfileDetailSchema, `/practice-profiles/${raced.id}`);
      const results = await Promise.all(
        [0, 1].map((index) =>
          api('PATCH', `/practice-profiles/${raced.id}`, index, {
            expectedRevision: current.profile.revision,
            fields: [
              { key: `round_${round}_${index}`, label: 'Raced', type: 'text', required: false },
            ],
          }),
        ),
      );
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const stale = results.find((r) => r.status === 409)!;
      expect(((await stale.json()) as { code: string }).code).toBe('PROFILE_CHANGED');
    }
  });

  it('validates list status and cursor parameters', async () => {
    for (const query of [
      'status=all',
      `afterName=Edge`,
      `afterId=${randomUUID()}`,
      'afterName=Edge&afterId=not-a-uuid',
    ])
      expect((await api('GET', `/practice-profiles?${query}`)).status).toBe(422);
    expect((await api('GET', '/practice-profiles/not-a-uuid')).status).toBe(422);
  });
});

describe('profile list paging', () => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const collect = async (status: 'active' | 'archived') => {
    const pages: { names: string[]; ids: string[]; next: boolean }[] = [];
    let cursor = '';
    for (;;) {
      const page = await get(
        practiceProfileListSchema,
        `/practice-profiles?status=${status}${cursor}`,
        9,
      );
      pages.push({
        names: page.items.map((i) => i.name),
        ids: page.items.map((i) => i.id),
        next: page.nextCursor !== null,
      });
      if (!page.nextCursor) return pages;
      expect(page.nextCursor).toEqual({
        afterName: page.items.at(-1)!.name,
        afterId: page.items.at(-1)!.id,
      });
      cursor = `&afterName=${encodeURIComponent(page.nextCursor.afterName)}&afterId=${page.nextCursor.afterId}`;
    }
  };

  it('pages active profiles by case-insensitive name across the 20-item boundary', async () => {
    // Created out of order with mixed case, so neither creation order nor case decides.
    const order = [
      7, 19, 3, 22, 11, 1, 15, 20, 5, 13, 9, 17, 2, 21, 8, 4, 18, 10, 14, 6, 16, 12, 23,
    ];
    const name = (n: number) => `${n % 2 ? 'AREA' : 'area'} ${pad(n)}`;
    for (const n of order.slice(0, 20)) await profile(9, { name: name(n), fields: [] });
    const exact = await collect('active');
    expect(exact).toHaveLength(1);
    expect(exact[0]!.names).toHaveLength(20);
    expect(exact[0]!.next).toBe(false);

    for (const n of order.slice(20)) await profile(9, { name: name(n), fields: [] });
    const pages = await collect('active');
    expect(pages.map((p) => p.names.length)).toEqual([20, 3]);
    expect(pages.flatMap((p) => p.names)).toEqual(
      Array.from({ length: 23 }, (_, i) => name(i + 1)),
    );
  });

  it('pages archived profiles that share a name in different cases by id across pages', async () => {
    const ids: string[] = [];
    const archive = async (profileName: string) => {
      const p = await profile(9, { name: profileName, fields: [] });
      await revise(9, p.id, { expectedRevision: 1, archived: true });
      return p.id;
    };
    for (let n = 1; n <= 18; n++) await archive(`Old ${pad(n)}`);
    for (const variant of ['Tied', 'TIED', 'tied']) ids.push(await archive(variant));
    const pages = await collect('archived');
    expect(pages.map((p) => p.names.length)).toEqual([20, 1]);
    const tied = pages.flatMap((p) => p.ids).slice(18);
    // Ties on the lower-cased name follow the id, including across the page boundary.
    expect(tied).toEqual([...ids].sort());
    expect(new Set(pages.flatMap((p) => p.ids)).size).toBe(21);
    // Archived profiles never appear in the active list.
    const active = (await collect('active')).flatMap((p) => p.ids);
    for (const id of ids) expect(active).not.toContain(id);
  });
});

describe('matter creation with a profile', () => {
  it('replays a creation by key after its version is superseded and keeps values out of receipts', async () => {
    const p = await profile(0, { name: 'Edge create replay', fields: intakeFields });
    const key = randomUUID();
    const body = {
      title: 'Edge replay matter',
      profileVersionId: p.currentVersion.id,
      fieldValues: { client_ref: 'SECRET-REF-4471', urgent: true },
    };
    const first = await parse(
      createMatterResultSchema,
      await api('POST', '/matters', 0, body, key),
    );
    expect(first.matter.profile).toEqual({ id: p.id, name: p.name, version: 1 });
    await revise(0, p.id, { expectedRevision: 1, fields: optionalFields });
    await revise(0, p.id, { expectedRevision: 2, archived: true });
    // Same intent with reordered values replays instead of meeting the archived profile.
    const replay = await parse(
      createMatterResultSchema,
      await api(
        'POST',
        '/matters',
        0,
        { ...body, fieldValues: { urgent: true, client_ref: 'SECRET-REF-4471' } },
        key,
      ),
    );
    expect(replay.commandId).toBe(first.commandId);
    expect(replay.matter).toMatchObject({ id: first.matter.id, profile: { version: 1 } });
    await refused(
      api('POST', '/matters', 0, { ...body, fieldValues: { client_ref: 'Other' } }, key),
      409,
      'IDEMPOTENCY_CONFLICT',
    );
    expect(
      await sql`select count(*)::int as n from matters where firm_id=${firm} and title='Edge replay matter'`,
    ).toEqual([{ n: 1 }]);
    const history = await sql`select r.response,a.before,a.after from command_receipts r
      join audit_logs a on a.command_id=r.id where r.firm_id=${firm} and r.idempotency_key=${key}`;
    expect(history).toHaveLength(1);
    expect(JSON.stringify(history)).not.toContain('SECRET-REF-4471');
    expect(history[0]!.after).toMatchObject({ fieldKeys: ['client_ref', 'urgent'] });
  });

  it('refuses unknown and other-firm versions for a new matter', async () => {
    await refused(
      api('POST', '/matters', 0, { title: 'Edge unknown', profileVersionId: randomUUID() }),
      404,
      'PROFILE_UNAVAILABLE',
    );
    const foreign = await profile(6, { name: 'Edge foreign', fields: optionalFields });
    await refused(
      api('POST', '/matters', 0, {
        title: 'Edge foreign',
        profileVersionId: foreign.currentVersion.id,
      }),
      404,
      'PROFILE_UNAVAILABLE',
    );
    expect(
      await sql`select count(*)::int as n from matters where firm_id=${firm} and title like 'Edge unknown%'`,
    ).toEqual([{ n: 0 }]);
  });
});

describe('matter field edits', () => {
  let edgeProfile: PracticeProfileRecord;
  beforeAll(async () => {
    edgeProfile = await profile(0, { name: 'Edge fields', fields: intakeFields });
  });

  it('assigns only the current version of an active profile of the firm, then pins it', async () => {
    const bare = await matter(0, { title: 'Edge assignment' });
    const optional = await profile(0, { name: 'Edge optional', fields: optionalFields });
    const superseded = optional.currentVersion.id;
    const current = await revise(0, optional.id, {
      expectedRevision: 1,
      fields: [
        ...optionalFields,
        { key: 'urgent', label: 'Urgent', type: 'yes_no', required: false },
      ],
    });
    const foreign = await profile(6, { name: 'Edge foreign assign', fields: optionalFields });
    const attempts: [string, Record<string, unknown>, number, string][] = [
      ['unknown', { profileVersionId: randomUUID(), values: {} }, 404, 'PROFILE_UNAVAILABLE'],
      [
        'foreign',
        { profileVersionId: foreign.currentVersion.id, values: {} },
        404,
        'PROFILE_UNAVAILABLE',
      ],
      ['superseded', { profileVersionId: superseded, values: {} }, 409, 'PROFILE_CHANGED'],
      [
        'required',
        { profileVersionId: edgeProfile.currentVersion.id, values: {} },
        422,
        'FIELD_VALUES_INVALID',
      ],
      [
        'stale',
        { expectedRevision: 9, profileVersionId: current.currentVersion.id, values: {} },
        409,
        'MATTER_CHANGED',
      ],
    ];
    for (const [, body, status, expected] of attempts)
      await refused(
        api('PATCH', `/matters/${bare.id}/fields`, 0, { expectedRevision: 1, ...body }),
        status,
        expected,
      );
    expect(await get(matterFieldsSchema, `/matters/${bare.id}/fields`)).toMatchObject({
      revision: 1,
      profile: null,
      values: {},
    });

    // Assigning a profile with no required fields and no values is still a change.
    const assigned = await parse(
      matterFieldsResultSchema,
      await api('PATCH', `/matters/${bare.id}/fields`, 0, {
        expectedRevision: 1,
        profileVersionId: current.currentVersion.id,
        values: {},
      }),
    );
    expect(assigned.fields).toMatchObject({
      revision: 2,
      profile: { id: optional.id, version: { version: 2 } },
      values: {},
    });
    const [audit] = await sql`select after from audit_logs
      where firm_id=${firm} and action='matter.fields.update.v1' and record_id=${bare.id}`;
    expect(audit!.after).toEqual({
      revision: 2,
      profileVersionId: current.currentVersion.id,
      assigned: true,
      changed: [],
    });
    // Re-sending the pinned version is not a re-pin.
    const edited = await parse(
      matterFieldsResultSchema,
      await api('PATCH', `/matters/${bare.id}/fields`, 0, {
        expectedRevision: 2,
        profileVersionId: current.currentVersion.id,
        values: { urgent: true },
      }),
    );
    expect(edited.fields).toMatchObject({ revision: 3, values: { urgent: true } });
    for (const values of [{}, { urgent: true }, { notes: null }])
      await refused(
        api('PATCH', `/matters/${bare.id}/fields`, 0, { expectedRevision: 3, values }),
        409,
        'MATTER_FIELDS_UNCHANGED',
      );
    await refused(
      api('PATCH', `/matters/${bare.id}/fields`, 0, {
        expectedRevision: 3,
        profileVersionId: superseded,
        values: { urgent: false },
      }),
      409,
      'PROFILE_PINNED',
    );
    expect((await sql`select revision from matters where id=${bare.id}`)[0]!.revision).toBe(3);
  });

  it('never serves a matter revision with a stale profile summary during a first assignment', async () => {
    for (let round = 0; round < 3; round++) {
      const bare = await matter(0, { title: `Edge read race ${round}` });
      await grant(bare.id, 2, 'reader');
      const [assigned, read] = await Promise.all([
        api('PATCH', `/matters/${bare.id}/fields`, 0, {
          expectedRevision: 1,
          profileVersionId: edgeProfile.currentVersion.id,
          values: { client_ref: 'Racing read' },
        }),
        new Promise((r) => setTimeout(r, 2)).then(() =>
          get(matterSchema, `/matters/${bare.id}`, 2),
        ),
      ]);
      expect(assigned.status).toBe(200);
      // Each revision has one content: revision 1 has no profile, revision 2 has it.
      expect(read.profile === null).toBe(read.revision === 1);
    }
  });

  it('walls owners and admins without a grant from reading or editing values', async () => {
    const walled = await matter(2, {
      title: 'Edge walled',
      profileVersionId: edgeProfile.currentVersion.id,
      fieldValues: { client_ref: 'WALLED-VALUE-9013' },
    });
    for (const index of [0, 1]) {
      const read = await refused(
        api('GET', `/matters/${walled.id}/fields`, index),
        404,
        'MATTER_UNAVAILABLE',
      );
      expect(read).not.toContain('WALLED-VALUE-9013');
      await refused(
        api('PATCH', `/matters/${walled.id}/fields`, index, {
          expectedRevision: 1,
          values: { notes: 'Owner override' },
        }),
        404,
        'MATTER_UNAVAILABLE',
      );
      const rows = await readAs(
        index,
        (tx) => tx`select field_values from matters where id=${walled.id}`,
      );
      expect(rows).toEqual([]);
    }
    await refused(
      api('PATCH', `/matters/${walled.id}/fields`, 6, {
        expectedRevision: 1,
        values: { notes: 'Foreign' },
      }),
      404,
      'MATTER_UNAVAILABLE',
    );
    expect((await sql`select revision from matters where id=${walled.id}`)[0]!.revision).toBe(1);
  });

  it('requires a manager grant and an editing role independently', async () => {
    const m = await matter(2, {
      title: 'Edge independent',
      profileVersionId: edgeProfile.currentVersion.id,
      fieldValues: { client_ref: 'R-1' },
    });
    // Editing role with only a reader grant: refused, whatever the firm role's seniority.
    for (const index of [0, 1, 7]) {
      await grant(m.id, index, 'reader');
      const view = await get(matterFieldsSchema, `/matters/${m.id}/fields`, index);
      expect(view).toMatchObject({ canEdit: false, values: { client_ref: 'R-1' } });
      await refused(
        api('PATCH', `/matters/${m.id}/fields`, index, {
          expectedRevision: view.revision,
          values: { notes: `Reader ${index}` },
        }),
        403,
        'MATTER_FIELDS_DENIED',
      );
    }
    // Manager grant with a non-editing role: refused (billing and readonly).
    for (const index of [4, 5]) {
      await grant(m.id, index, 'manager');
      const view = await get(matterFieldsSchema, `/matters/${m.id}/fields`, index);
      expect(view.canEdit).toBe(false);
      await refused(
        api('PATCH', `/matters/${m.id}/fields`, index, {
          expectedRevision: view.revision,
          values: { notes: `Manager ${index}` },
        }),
        403,
        'MATTER_FIELDS_DENIED',
      );
    }
    // Both conditions met: each editing role may change values.
    for (const index of [0, 1, 7]) {
      await grant(m.id, index, 'manager');
      const view = await get(matterFieldsSchema, `/matters/${m.id}/fields`, index);
      expect(view.canEdit).toBe(true);
      const saved = await parse(
        matterFieldsResultSchema,
        await api('PATCH', `/matters/${m.id}/fields`, index, {
          expectedRevision: view.revision,
          values: { notes: `Manager ${index}` },
        }),
      );
      expect(saved.fields.values.notes).toBe(`Manager ${index}`);
    }
  });

  it('re-checks the grant and membership on every replay and drops access for removed members', async () => {
    const m = await matter(0, {
      title: 'Edge revocation',
      profileVersionId: edgeProfile.currentVersion.id,
      fieldValues: { client_ref: 'REVOKED-VALUE-5521' },
    });
    await grant(m.id, 8, 'manager');
    const key = randomUUID();
    const body = { expectedRevision: 1, values: { notes: 'Paralegal note' } };
    const first = await parse(
      matterFieldsResultSchema,
      await api('PATCH', `/matters/${m.id}/fields`, 8, body, key),
    );
    const replay = () => api('PATCH', `/matters/${m.id}/fields`, 8, body, key);

    await revoke(m.id, 8);
    const hidden = await refused(replay(), 404, 'MATTER_UNAVAILABLE');
    expect(hidden).not.toContain('REVOKED-VALUE-5521');
    await refused(api('GET', `/matters/${m.id}/fields`, 8), 404, 'MATTER_UNAVAILABLE');
    expect(await readAs(8, (tx) => tx`select field_values from matters where id=${m.id}`)).toEqual(
      [],
    );

    await grant(m.id, 8, 'reader');
    await refused(replay(), 403, 'MATTER_FIELDS_DENIED');
    await grant(m.id, 8, 'manager');
    await setRole(8, 'billing');
    try {
      await refused(replay(), 403, 'MATTER_FIELDS_DENIED');
    } finally {
      await setRole(8, 'paralegal');
    }
    const restored = await parse(matterFieldsResultSchema, await replay());
    expect(restored.commandId).toBe(first.commandId);

    await sql`update firm_members set deleted_at=now() where firm_id=${firm} and user_id=${users[8]!}`;
    try {
      await refused(replay(), 403, 'FIRM_ACCESS_DENIED');
      await refused(api('GET', `/matters/${m.id}/fields`, 8), 403, 'FIRM_ACCESS_DENIED');
      await refused(api('GET', '/practice-profiles', 8), 403, 'FIRM_ACCESS_DENIED');
      await refused(
        api('GET', `/practice-profiles/${edgeProfile.id}`, 8),
        403,
        'FIRM_ACCESS_DENIED',
      );
      expect(
        await readAs(8, (tx) => tx`select id from practice_profiles where id=${edgeProfile.id}`),
      ).toEqual([]);
      expect(
        await readAs(8, (tx) => tx`select field_values from matters where id=${m.id}`),
      ).toEqual([]);
    } finally {
      await sql`update firm_members set deleted_at=null where firm_id=${firm} and user_id=${users[8]!}`;
    }
    // Exactly one edit happened; replays never wrote history.
    expect(
      await sql`select count(*)::int as n from audit_logs
        where firm_id=${firm} and action='matter.fields.update.v1' and record_id=${m.id}`,
    ).toEqual([{ n: 1 }]);
  });

  it('refuses one action key reused for another matter', async () => {
    const a = await matter(0, {
      title: 'Edge key A',
      profileVersionId: edgeProfile.currentVersion.id,
      fieldValues: { client_ref: 'A' },
    });
    const b = await matter(0, {
      title: 'Edge key B',
      profileVersionId: edgeProfile.currentVersion.id,
      fieldValues: { client_ref: 'B' },
    });
    const key = randomUUID();
    const body = { expectedRevision: 1, values: { urgent: true } };
    await parse(
      matterFieldsResultSchema,
      await api('PATCH', `/matters/${a.id}/fields`, 0, body, key),
    );
    await refused(
      api('PATCH', `/matters/${b.id}/fields`, 0, body, key),
      409,
      'IDEMPOTENCY_CONFLICT',
    );
    expect((await get(matterFieldsSchema, `/matters/${b.id}/fields`)).revision).toBe(1);
  });
});
