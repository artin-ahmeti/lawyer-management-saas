import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  forumListSchema,
  forumResultSchema,
  matterJurisdictionListSchema,
  matterJurisdictionResultSchema,
  type ForumList,
  type ForumRecord,
} from '@lawfirm/core';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/common/http';

/**
 * Edge cases of the D023 contract the main jurisdiction suite does not reach: each role and
 * grant condition alone, membership removal and return, replays after access changes, action
 * keys across commands and actors, races, the reference cap boundary, keyset paging with
 * ties, indistinguishable unavailable records and request hygiene. Every test builds its own
 * matters and forums.
 */
const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local DB required');
const sql = postgres(url, { max: 4 });
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
  { role: 'owner', firm: pagingFirm }, // 7
  { role: 'attorney', firm }, // 8 demoted, revoked and removed
  { role: 'admin', firm }, // 9 second admin, demoted
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
async function raw(
  method: string,
  path: string,
  index: number,
  body?: string | Uint8Array,
  headers: Record<string, string> = { 'Idempotency-Key': randomUUID() },
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await token(index)}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body === undefined ? {} : { body }),
  });
}
const api = (method: string, path: string, index = 0, body?: unknown, key: string = randomUUID()) =>
  raw(method, path, index, body === undefined ? undefined : JSON.stringify(body), {
    'Idempotency-Key': key,
  });
const parse = async <T>(schema: z.ZodType<T>, response: Response) => {
  expect(response.status).toBeLessThan(300);
  return schema.parse(await response.json());
};
async function refused(response: Promise<Response>, status: number, expected?: string) {
  const r = await response;
  const text = await r.text();
  expect(r.status, text).toBe(status);
  if (expected) expect((JSON.parse(text) as { code?: string }).code).toBe(expected);
  return JSON.parse(text) as { code: string; message: string; requestId: string };
}
/** The public part of an error: the request id differs per call by design. */
const outcome = async (response: Promise<Response>) => {
  const r = await response;
  const body = (await r.json()) as { code?: string; message?: string };
  return { status: r.status, code: body.code, message: body.message };
};

const forumPath = (id = '') => (id ? `/forums/${id}` : '/forums');
const refsPath = (matter: string) => `/matters/${matter}/jurisdictions`;
const endPath = (matter: string) => `/matters/${matter}/jurisdiction-endings`;
async function forum(index: number, body: Record<string, unknown>, key?: string) {
  const response = await api('POST', forumPath(), index, body, key);
  expect(response.status).toBe(201);
  return parse(forumResultSchema, response);
}
async function updateForum(index: number, id: string, body: Record<string, unknown>, key?: string) {
  return parse(forumResultSchema, await api('PATCH', forumPath(id), index, body, key));
}
async function add(matter: string, body: Record<string, unknown>, index = 0, key?: string) {
  const response = await api('POST', refsPath(matter), index, body, key);
  expect(response.status, await response.clone().text()).toBe(201);
  return parse(matterJurisdictionResultSchema, response);
}
async function end(matter: string, referenceId: string, index = 0, key?: string) {
  return parse(
    matterJurisdictionResultSchema,
    await api('POST', endPath(matter), index, { referenceId }, key),
  );
}
const references = (matter: string, index = 0) =>
  api('GET', refsPath(matter), index).then((r) => parse(matterJurisdictionListSchema, r));
const forums = (params: Record<string, string> = {}, index = 0) =>
  api('GET', `/forums?${new URLSearchParams(params)}`, index).then((r) =>
    parse(forumListSchema, r),
  );

const grant = (matterId: string, index: number, role: 'reader' | 'manager') =>
  sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by)
    values (${firm},${matterId},${users[index]!},${role},${users[0]!})
    on conflict (firm_id,matter_id,user_id) do update set role=excluded.role,deleted_at=null`;
const revoke = (matterId: string, index: number) =>
  sql`update matter_access set deleted_at=now() where matter_id=${matterId} and user_id=${users[index]!}`;
const setRole = (index: number, role: string) =>
  sql`update firm_members set role=${role} where firm_id=${members[index]!.firm} and user_id=${users[index]!}`;
const setMembership = (index: number, removed: boolean) =>
  sql`update firm_members set deleted_at=${removed ? sql`now()` : null}
    where firm_id=${members[index]!.firm} and user_id=${users[index]!}`;
async function matter(title: string, grants: [number, 'reader' | 'manager'][] = [[0, 'manager']]) {
  const id = randomUUID();
  await sql`insert into matters(id,firm_id,title,created_by) values (${id},${firm},${title},${users[0]!})`;
  for (const [index, role] of grants) await grant(id, index, role);
  return id;
}
/** Current references inserted directly, as the main suite seeds its cap test. */
const seedReferences = (matterId: string, n: number, prefix: string) =>
  sql`insert into matter_jurisdictions(firm_id,matter_id,purpose,jurisdiction,docket_number,created_by)
    select ${firm},${matterId},'venue','US',${prefix} || '-' || n,${users[0]!} from generate_series(1,${n}) n`;
const currentCount = async (matterId: string) =>
  (
    await sql`select count(*)::int as n from matter_jurisdictions
      where matter_id=${matterId} and deleted_at is null`
  )[0]!.n as number;
const audits = async (action: string, extra = sql``) =>
  (
    await sql`select count(*)::int as n from audit_logs
      where firm_id=${firm} and action=${action} ${extra}`
  )[0]!.n as number;
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

beforeAll(async () => {
  process.env.DATABASE_URL = url;
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.SUPABASE_JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
  for (const [i, user] of users.entries()) {
    await sql`insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@jurisdiction-edges.test`},now(),'{}'::jsonb)`;
    await sql`insert into auth.sessions(id,user_id) values (${sessions[i]!},${user})`;
  }
  await sql`insert into firms(id,name) values (${firm},'Jurisdiction edge firm'),
    (${otherFirm},'Other jurisdiction edge firm'),(${pagingFirm},'Paging jurisdiction edge firm')`;
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
    await tx`delete from matter_jurisdictions where firm_id in ${tx(firms)}`;
    await tx`delete from forums where firm_id in ${tx(firms)}`;
    await tx`delete from matter_access where firm_id in ${tx(firms)}`;
    await tx`delete from matters where firm_id in ${tx(firms)}`;
  });
  await sql`delete from firm_members where firm_id in ${sql(firms)}`;
  await sql`delete from audit_logs where firm_id in ${sql(firms)}`;
  await sql`delete from firms where id in ${sql(firms)}`;
  for (const user of users) await sql`delete from auth.users where id=${user}`;
  await sql.end();
});

describe('each role and grant condition alone', () => {
  let m: string, seeded: string;
  beforeAll(async () => {
    m = await matter('Edge conditions', [
      [1, 'reader'],
      [2, 'manager'],
      [3, 'manager'],
      [4, 'manager'],
      [5, 'manager'],
      [9, 'manager'],
    ]);
    seeded = (await add(m, { purpose: 'venue', jurisdiction: 'NJ', docketNumber: 'EDGE-1' }, 2))
      .reference.id;
  });

  it('gives an owner without a grant the same answer as a matter that does not exist', async () => {
    const missing = randomUUID();
    for (const [method, path, body] of [
      ['GET', refsPath, undefined],
      ['POST', refsPath, { purpose: 'governing_law', jurisdiction: 'OH' }],
      ['POST', endPath, { referenceId: seeded }],
    ] as const) {
      const owner = await outcome(api(method, path(m), 0, body));
      expect(owner).toEqual({
        status: 404,
        code: 'MATTER_UNAVAILABLE',
        message: 'This matter is unavailable.',
      });
      expect(await outcome(api(method, path(missing), 0, body))).toEqual(owner);
    }
    expect(await currentCount(m)).toBe(1);
  });

  it('lets an admin reader see references and dockets but not add or end them', async () => {
    const list = await references(m, 1);
    expect(list.canManage).toBe(false);
    expect(list.items.map((r) => r.docketNumber)).toEqual(['EDGE-1']);
    await refused(
      api('POST', refsPath(m), 1, { purpose: 'governing_law', jurisdiction: 'OH' }),
      403,
      'MATTER_JURISDICTION_MANAGEMENT_DENIED',
    );
    await refused(
      api('POST', endPath(m), 1, { referenceId: seeded }),
      403,
      'MATTER_JURISDICTION_MANAGEMENT_DENIED',
    );
  });

  it('lets an admin manager add and end references', async () => {
    expect((await references(m, 9)).canManage).toBe(true);
    const added = await add(m, { purpose: 'governing_law', jurisdiction: 'OH' }, 9);
    expect((await end(m, added.reference.id, 9)).reference.endedAt).not.toBeNull();
  });

  it('lets attorney and paralegal managers add and end references', async () => {
    for (const index of [2, 3]) {
      expect((await references(m, index)).canManage).toBe(true);
      const added = await add(
        m,
        { purpose: 'other', jurisdiction: 'MA', label: `Seat ${index}` },
        index,
      );
      const ended = await end(m, added.reference.id, index);
      expect(ended.reference).toMatchObject({ id: added.reference.id, label: `Seat ${index}` });
      expect(ended.reference.endedAt).not.toBeNull();
    }
  });

  it('refuses billing and readonly staff even with a manager grant', async () => {
    const before = await audits('matter.jurisdiction.add.v1', sql`and record_id=${m}`);
    for (const index of [4, 5]) {
      const list = await references(m, index);
      expect(list.canManage).toBe(false);
      expect(list.items.map((r) => r.id)).toEqual([seeded]);
      await refused(
        api('POST', refsPath(m), index, { purpose: 'governing_law', jurisdiction: 'OK' }),
        403,
        'MATTER_JURISDICTION_MANAGEMENT_DENIED',
      );
      await refused(
        api('POST', endPath(m), index, { referenceId: seeded }),
        403,
        'MATTER_JURISDICTION_MANAGEMENT_DENIED',
      );
    }
    expect(await currentCount(m)).toBe(1);
    expect(await audits('matter.jurisdiction.add.v1', sql`and record_id=${m}`)).toBe(before);
  });

  it('gives each role exactly its forum capabilities', async () => {
    const expected: Record<number, [boolean, boolean]> = {
      0: [true, true],
      1: [true, true],
      2: [true, false],
      3: [true, false],
      4: [false, false],
      5: [false, false],
    };
    const target = (
      await forum(0, { name: 'Edge capability board', kind: 'agency', jurisdiction: 'OR' })
    ).forum;
    for (const [index, [canCreate, canManage]] of Object.entries(expected).map(
      ([i, v]) => [Number(i), v] as const,
    )) {
      const list = await forums({ jurisdiction: 'OR' }, index);
      expect([list.canCreate, list.canManage]).toEqual([canCreate, canManage]);
      const created = await api('POST', forumPath(), index, {
        name: `Edge role ${index} board`,
        kind: 'agency',
        jurisdiction: 'OR',
      });
      if (canCreate) expect(created.status).toBe(201);
      else await refused(Promise.resolve(created), 403, 'CAPABILITY_DENIED');
      if (!canManage)
        for (const change of [{ name: `Edge renamed ${index}` }, { archived: true }])
          await refused(
            api('PATCH', forumPath(target.id), index, { expectedRevision: 1, ...change }),
            403,
            'CAPABILITY_DENIED',
          );
    }
    const unchanged = (await forums({ jurisdiction: 'OR' })).items.find((f) => f.id === target.id);
    expect(unchanged).toMatchObject({
      name: 'Edge capability board',
      revision: 1,
      archived: false,
    });
    // Owner and admin each change it once.
    await updateForum(0, target.id, { expectedRevision: 1, name: 'Edge capability board II' });
    await updateForum(1, target.id, { expectedRevision: 2, archived: true });
  });
});

describe('membership and replays after access changes', () => {
  it('closes every forum and reference route to a removed member and reopens them on return', async () => {
    const m = await matter('Edge removal', [[8, 'manager']]);
    const forumKey = randomUUID(),
      addKey = randomUUID();
    const forumBody = { name: 'Edge removal tribunal', kind: 'tribunal', jurisdiction: 'NM' };
    const created = await forum(8, forumBody, forumKey);
    const addBody = { purpose: 'venue', jurisdiction: 'NM', forumId: created.forum.id };
    const first = await add(m, addBody, 8, addKey);

    await setMembership(8, true);
    try {
      await refused(api('GET', forumPath(), 8), 403, 'FIRM_ACCESS_DENIED');
      await refused(api('GET', refsPath(m), 8), 403, 'FIRM_ACCESS_DENIED');
      await refused(api('POST', forumPath(), 8, forumBody, forumKey), 403, 'FIRM_ACCESS_DENIED');
      await refused(api('POST', refsPath(m), 8, addBody, addKey), 403, 'FIRM_ACCESS_DENIED');
      await refused(
        api('POST', endPath(m), 8, { referenceId: first.reference.id }),
        403,
        'FIRM_ACCESS_DENIED',
      );
      expect(
        await readAs(8, (tx) => tx`select id from forums where id=${created.forum.id}`),
      ).toEqual([]);
      expect(
        await readAs(8, (tx) => tx`select id from matter_jurisdictions where matter_id=${m}`),
      ).toEqual([]);
    } finally {
      await setMembership(8, false);
    }
    const forumReplay = await forum(8, forumBody, forumKey);
    expect(forumReplay.commandId).toBe(created.commandId);
    const addReplay = await add(m, addBody, 8, addKey);
    expect(addReplay).toEqual(first);
    expect(await currentCount(m)).toBe(1);
    expect(await audits('forum.create.v1', sql`and record_id=${created.forum.id}`)).toBe(1);
    expect(await audits('matter.jurisdiction.add.v1', sql`and record_id=${m}`)).toBe(1);
  });

  it('rechecks the role and the grant on every reference replay', async () => {
    const m = await matter('Edge reference replay', [[8, 'manager']]);
    const addKey = randomUUID(),
      endKey = randomUUID();
    const body = { purpose: 'agency', jurisdiction: 'KS', docketNumber: 'REPLAY-77' };
    const first = await add(m, body, 8, addKey);
    const replayAdd = () => api('POST', refsPath(m), 8, body, addKey);

    await grant(m, 8, 'reader');
    await refused(replayAdd(), 403, 'MATTER_JURISDICTION_MANAGEMENT_DENIED');
    await revoke(m, 8);
    const hidden = await refused(replayAdd(), 404, 'MATTER_UNAVAILABLE');
    expect(JSON.stringify(hidden)).not.toContain('REPLAY-77');
    await grant(m, 8, 'manager');
    await setRole(8, 'billing');
    try {
      await refused(replayAdd(), 403, 'MATTER_JURISDICTION_MANAGEMENT_DENIED');
    } finally {
      await setRole(8, 'attorney');
    }
    expect((await add(m, body, 8, addKey)).commandId).toBe(first.commandId);

    const ended = await end(m, first.reference.id, 8, endKey);
    const replayEnd = () => api('POST', endPath(m), 8, { referenceId: first.reference.id }, endKey);
    await setRole(8, 'readonly');
    try {
      await refused(replayEnd(), 403, 'MATTER_JURISDICTION_MANAGEMENT_DENIED');
    } finally {
      await setRole(8, 'attorney');
    }
    await revoke(m, 8);
    await refused(replayEnd(), 404, 'MATTER_UNAVAILABLE');
    await grant(m, 8, 'manager');
    expect(await parse(matterJurisdictionResultSchema, await replayEnd())).toEqual(ended);
    // A replayed addition shows the reference as it is now, under the original command.
    const after = await add(m, body, 8, addKey);
    expect(after.commandId).toBe(first.commandId);
    expect(after.reference.endedAt).toBe(ended.reference.endedAt);
    expect(await audits('matter.jurisdiction.add.v1', sql`and record_id=${m}`)).toBe(1);
    expect(await audits('matter.jurisdiction.end.v1', sql`and record_id=${m}`)).toBe(1);
  });

  it('rechecks the role on forum create and update replays', async () => {
    const createKey = randomUUID(),
      updateKey = randomUUID();
    const body = { name: 'Edge replay commission', kind: 'agency', jurisdiction: 'NE' };
    const created = await forum(8, body, createKey);
    await setRole(8, 'billing');
    try {
      await refused(api('POST', forumPath(), 8, body, createKey), 403, 'CAPABILITY_DENIED');
    } finally {
      await setRole(8, 'attorney');
    }
    expect((await forum(8, body, createKey)).commandId).toBe(created.commandId);

    const change = { expectedRevision: 1, name: 'Edge replay commission (renamed)' };
    const updated = await updateForum(9, created.forum.id, change, updateKey);
    await setRole(9, 'attorney');
    try {
      await refused(
        api('PATCH', forumPath(created.forum.id), 9, change, updateKey),
        403,
        'CAPABILITY_DENIED',
      );
    } finally {
      await setRole(9, 'admin');
    }
    const replay = await updateForum(9, created.forum.id, change, updateKey);
    expect(replay).toEqual(updated);
    expect(replay.forum.revision).toBe(2);
    expect(await audits('forum.update.v1', sql`and record_id=${created.forum.id}`)).toBe(1);
    expect(
      (
        await sql`select count(*)::int as n from forums where firm_id=${firm} and name like 'Edge replay commission%'`
      )[0]!.n,
    ).toBe(1);
  });

  it('replays an addition ahead of the later archive and cap checks', async () => {
    const m = await matter('Edge replay ordering');
    const f = (await forum(0, { name: 'Edge ordering court', kind: 'court', jurisdiction: 'KY' }))
      .forum;
    const key = randomUUID();
    const body = { purpose: 'venue', jurisdiction: 'KY', forumId: f.id };
    const first = await add(m, body, 0, key);
    await updateForum(0, f.id, { expectedRevision: 1, archived: true });
    await seedReferences(m, 49, 'ORDER');
    expect(await currentCount(m)).toBe(50);
    const replay = await add(m, body, 0, key);
    expect(replay.commandId).toBe(first.commandId);
    expect(replay.reference.forum).toMatchObject({ id: f.id, archived: true });
    await refused(
      api('POST', refsPath(m), 0, { purpose: 'governing_law', jurisdiction: 'KY' }),
      409,
      'REFERENCE_LIMIT',
    );
  });
});

describe('action keys', () => {
  it('keeps one key independent for each command', async () => {
    const m = await matter('Edge key commands');
    const key = randomUUID();
    const created = await forum(
      0,
      { name: 'Edge shared key court', kind: 'court', jurisdiction: 'ID' },
      key,
    );
    // The forum creation key names a separate intent for a reference addition.
    const addBody = { purpose: 'venue', jurisdiction: 'ID', forumId: created.forum.id };
    const added = await add(m, addBody, 0, key);
    expect(added.commandId).not.toBe(created.commandId);
    expect(added.reference.forum?.id).toBe(created.forum.id);
    expect((await add(m, addBody, 0, key)).commandId).toBe(added.commandId);
    const updated = await updateForum(
      0,
      created.forum.id,
      { expectedRevision: 1, name: 'Edge shared key court II' },
      key,
    );
    expect(updated.forum.revision).toBe(2);
    const ended = await end(m, added.reference.id, 0, key);
    expect(new Set([created, added, updated, ended].map((r) => r.commandId)).size).toBe(4);
    // Each command still replays its own intent under the shared key.
    const createReplay = await forum(
      0,
      { name: 'Edge shared key court', kind: 'court', jurisdiction: 'ID' },
      key,
    );
    expect(createReplay.commandId).toBe(created.commandId);
    expect(createReplay.forum).toMatchObject({ id: created.forum.id, revision: 2 });
    await refused(
      api('POST', refsPath(m), 0, { purpose: 'governing_law', jurisdiction: 'ID' }, key),
      409,
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('never replays another actor’s command under the same key', async () => {
    const m = await matter('Edge key actors', [
      [0, 'manager'],
      [3, 'manager'],
    ]);
    const key = randomUUID();
    const body = { name: 'Edge actor key board', kind: 'agency', jurisdiction: 'IA' };
    const owner = await forum(0, body, key);
    // Same key and body from another person is that person's own creation of a taken name.
    await refused(api('POST', forumPath(), 3, body, key), 409, 'FORUM_NAME_TAKEN');
    const theirs = await forum(3, { ...body, name: 'Edge actor key board 2' }, key);
    expect(theirs.forum.id).not.toBe(owner.forum.id);
    expect(theirs.commandId).not.toBe(owner.commandId);

    const refBody = { purpose: 'agency', jurisdiction: 'IA', forumId: owner.forum.id };
    const ownerRef = await add(m, refBody, 0, key);
    await refused(api('POST', refsPath(m), 3, refBody, key), 409, 'REFERENCE_EXISTS');
    const endKey = randomUUID();
    await end(m, ownerRef.reference.id, 0, endKey);
    // Another manager's end under the same key is a new intent against an ended reference.
    await refused(
      api('POST', endPath(m), 3, { referenceId: ownerRef.reference.id }, endKey),
      409,
      'REFERENCE_ENDED',
    );
  });

  it('treats any identifier or key case and any body key order as one forum update', async () => {
    const f = (await forum(0, { name: 'Edge case court', kind: 'court', jurisdiction: 'IN' }))
      .forum;
    const key = randomUUID();
    const first = await updateForum(
      0,
      f.id.toUpperCase(),
      { expectedRevision: 1, name: 'Edge case court II' },
      key,
    );
    expect(first.forum.id).toBe(f.id);
    for (const [id, k] of [
      [f.id, key],
      [f.id.toUpperCase(), key.toUpperCase()],
      [f.id, key.toUpperCase()],
    ] as const)
      expect(
        await updateForum(0, id, { name: 'Edge case court II', expectedRevision: 1 }, k),
      ).toEqual(first);
    const second = randomUUID();
    const archived = await updateForum(0, f.id, { expectedRevision: 2, archived: true }, second);
    expect(
      await updateForum(0, f.id.toUpperCase(), { archived: true, expectedRevision: 2 }, second),
    ).toEqual(archived);
    expect(archived.forum.revision).toBe(3);
    expect(await audits('forum.update.v1', sql`and record_id=${f.id}`)).toBe(2);
    await refused(
      api('PATCH', forumPath(f.id), 0, { expectedRevision: 2, archived: false }, second),
      409,
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('replays an ending sent with identifiers in either case', async () => {
    const m = await matter('Edge end case');
    const r = await add(m, { purpose: 'governing_law', jurisdiction: 'HI' });
    const key = randomUUID();
    const first = await end(m.toUpperCase(), r.reference.id.toUpperCase(), 0, key);
    expect(first.reference.id).toBe(r.reference.id);
    expect(await end(m, r.reference.id, 0, key)).toEqual(first);
    expect(await audits('matter.jurisdiction.end.v1', sql`and record_id=${m}`)).toBe(1);
  });

  it('refuses writes without a UUID action key before touching data', async () => {
    const m = await matter('Edge missing key');
    const writes: [string, string, unknown][] = [
      ['POST', forumPath(), { name: 'Edge keyless', kind: 'agency', jurisdiction: 'AL' }],
      ['POST', refsPath(m), { purpose: 'governing_law', jurisdiction: 'AL' }],
      ['POST', endPath(m), { referenceId: randomUUID() }],
    ];
    for (const [method, path, body] of writes)
      for (const headers of [{}, { 'Idempotency-Key': 'not-a-uuid' }] as Record<string, string>[])
        await refused(
          raw(method, path, 0, JSON.stringify(body), headers),
          422,
          'INVALID_ACTION_KEY',
        );
    expect(await currentCount(m)).toBe(0);
  });
});

describe('races', () => {
  it('ends one reference once when two managers end it together', async () => {
    const m = await matter('Edge end race', [
      [2, 'manager'],
      [3, 'manager'],
    ]);
    const r = await add(m, { purpose: 'venue', jurisdiction: 'GA', docketNumber: 'RACE-1' }, 2);
    const responses = await Promise.all([
      api('POST', endPath(m), 2, { referenceId: r.reference.id }),
      api('POST', endPath(m), 3, { referenceId: r.reference.id }),
    ]);
    expect(responses.map((x) => x.status).sort()).toEqual([200, 409]);
    const loser = responses.find((x) => x.status === 409)!;
    expect(((await loser.json()) as { code: string }).code).toBe('REFERENCE_ENDED');
    expect(await audits('matter.jurisdiction.end.v1', sql`and record_id=${m}`)).toBe(1);
  });

  it('ends once when one manager retries the same ending concurrently', async () => {
    const m = await matter('Edge end retry race');
    const r = await add(m, { purpose: 'governing_law', jurisdiction: 'FL' });
    const key = randomUUID();
    const results = await Promise.all(
      [0, 1].map(() => api('POST', endPath(m), 0, { referenceId: r.reference.id }, key)),
    );
    const [a, b] = await Promise.all(results.map((x) => parse(matterJurisdictionResultSchema, x)));
    expect(b).toEqual(a);
  });

  it('never names a forum in a reference added after the forum was archived', async () => {
    const m = await matter('Edge archive race', [[3, 'manager']]);
    for (let i = 0; i < 6; i += 1) {
      const f = (
        await forum(0, { name: `Edge race court ${i}`, kind: 'court', jurisdiction: 'NV' })
      ).forum;
      const [added, archived] = await Promise.all([
        api('POST', refsPath(m), 3, { purpose: 'venue', jurisdiction: 'NV', forumId: f.id }),
        api('PATCH', forumPath(f.id), 1, { expectedRevision: 1, archived: true }),
      ]);
      expect(archived.status).toBe(200);
      expect([201, 409]).toContain(added.status);
      if (added.status === 409)
        expect(((await added.json()) as { code: string }).code).toBe('FORUM_ARCHIVED');
    }
    const late = await sql`select r.id from matter_jurisdictions r join forums f
      on f.firm_id=r.firm_id and f.id=r.forum_id
      where r.matter_id=${m} and r.created_at >= f.archived_at`;
    expect(late).toEqual([]);
  });

  it('adds exactly one reference when two managers race for the last slot', async () => {
    const m = await matter('Edge cap race', [
      [2, 'manager'],
      [3, 'manager'],
    ]);
    await seedReferences(m, 49, 'RACE');
    const responses = await Promise.all([
      api('POST', refsPath(m), 2, { purpose: 'governing_law', jurisdiction: 'CT' }),
      api('POST', refsPath(m), 3, { purpose: 'governing_law', jurisdiction: 'CO' }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = responses.find((r) => r.status === 409)!;
    expect(((await loser.json()) as { code: string }).code).toBe('REFERENCE_LIMIT');
    expect(await currentCount(m)).toBe(50);
  });

  it('lets one of two concurrent forum creations or edits win and refuses the other', async () => {
    const body = { name: 'Edge race board', kind: 'agency', jurisdiction: 'DC' };
    const created = await Promise.all([
      api('POST', forumPath(), 2, body),
      api('POST', forumPath(), 3, body),
    ]);
    expect(created.map((r) => r.status).sort()).toEqual([201, 409]);
    const loser = created.find((r) => r.status === 409)!;
    expect(((await loser.json()) as { code: string }).code).toBe('FORUM_NAME_TAKEN');
    const winner = await parse(
      forumResultSchema,
      created.find((r) => r.status === 201)!,
    );
    const edits = await Promise.all([
      api('PATCH', forumPath(winner.forum.id), 0, {
        expectedRevision: 1,
        name: 'Edge race board A',
      }),
      api('PATCH', forumPath(winner.forum.id), 1, {
        expectedRevision: 1,
        name: 'Edge race board B',
      }),
    ]);
    expect(edits.map((r) => r.status).sort()).toEqual([200, 409]);
    const stale = edits.find((r) => r.status === 409)!;
    expect(((await stale.json()) as { code: string }).code).toBe('FORUM_CHANGED');

    const other = (
      await forum(0, { name: 'Edge race board C', kind: 'agency', jurisdiction: 'DC' })
    ).forum;
    const renames = await Promise.all([
      api('PATCH', forumPath(winner.forum.id), 0, {
        expectedRevision: 2,
        name: 'Edge race board D',
      }),
      api('PATCH', forumPath(other.id), 1, { expectedRevision: 1, name: 'edge race board d' }),
    ]);
    expect(renames.map((r) => r.status).sort()).toEqual([200, 409]);
    const taken = renames.find((r) => r.status === 409)!;
    expect(((await taken.json()) as { code: string }).code).toBe('FORUM_NAME_TAKEN');
  });
});

describe('reference cap', () => {
  it('accepts the 50th current reference, refuses the 51st and counts only current ones', async () => {
    const m = await matter('Edge cap boundary');
    await seedReferences(m, 49, 'CAP');
    // Ended references are history and never count against the cap.
    await sql`update matter_jurisdictions set deleted_at=clock_timestamp()
      where matter_id=${m} and docket_number in ('CAP-1','CAP-2','CAP-3')`;
    await seedReferences(m, 3, 'CAP-EXTRA');
    expect(await currentCount(m)).toBe(49);
    const last = await add(m, { purpose: 'governing_law', jurisdiction: 'AZ' });
    expect(await currentCount(m)).toBe(50);
    await refused(
      api('POST', refsPath(m), 0, { purpose: 'governing_law', jurisdiction: 'AR' }),
      409,
      'REFERENCE_LIMIT',
    );
    const list = await references(m);
    expect(list.items).toHaveLength(50);
    expect(list.items.every((r) => r.endedAt === null)).toBe(true);
    await end(m, last.reference.id);
    const freed = await add(m, { purpose: 'governing_law', jurisdiction: 'AR' });
    expect(freed.reference.endedAt).toBeNull();
    expect(await currentCount(m)).toBe(50);
  });
});

describe('forum list paging', () => {
  /** Tie group: one name, varied case, in twelve jurisdictions; it straddles the first page. */
  const tied = ['AL', 'AK', 'AZ', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'NY', 'TX', 'WA'];
  const spellings = ['Bb Court', 'bb court', 'BB COURT', 'Bb court'];
  beforeAll(async () => {
    const rows = [
      ...Array.from({ length: 14 }, (_, i) => ({
        name: `Aa Board ${String(i + 1).padStart(2, '0')}`,
        jurisdiction: 'TX',
      })),
      ...tied.map((jurisdiction, i) => ({ name: spellings[i % 4]!, jurisdiction })),
      ...Array.from({ length: 22 }, (_, i) => ({
        name: `Cc Board ${String(i + 1).padStart(2, '0')}`,
        jurisdiction: 'CA',
      })),
      ...Array.from({ length: 5 }, (_, i) => ({ name: `Dd Board ${i + 1}`, jurisdiction: 'TX' })),
    ];
    for (const row of rows)
      await sql`insert into forums(firm_id,name,kind,jurisdiction,created_by)
        values (${pagingFirm},${row.name},'court',${row.jurisdiction},${users[7]!})`;
    // Archived forums may repeat an active name; three share the tied name in CA. Forums start
    // active, so each is added under a placeholder name, then renamed and archived in one change.
    const archived = async (name: string, kind: string, jurisdiction: string) => {
      const [row] = await sql`insert into forums(firm_id,name,kind,jurisdiction,created_by)
        values (${pagingFirm},${`placeholder ${randomUUID()}`},${kind},${jurisdiction},${users[7]!})
        returning id`;
      await sql`update forums set name=${name},archived_at=now(),revision=2 where id=${row!.id}`;
    };
    for (const name of ['Bb Court', 'BB COURT', 'bb court']) await archived(name, 'court', 'CA');
    await archived('Old Board', 'agency', 'NY');
  });
  async function walk(params: Record<string, string>) {
    const pages: ForumList[] = [];
    let cursor: ForumList['nextCursor'] = null;
    do {
      const page: ForumList = await forums(
        { ...params, ...(cursor ? { afterName: cursor.afterName, afterId: cursor.afterId } : {}) },
        7,
      );
      pages.push(page);
      cursor = page.nextCursor;
      expect(pages.length).toBeLessThan(10);
    } while (cursor);
    return pages;
  }
  const expectedIds = async (archived: boolean, jurisdiction?: string) =>
    (
      await sql`select id from forums where firm_id=${pagingFirm}
        and ${archived ? sql`archived_at is not null` : sql`archived_at is null`}
        ${jurisdiction ? sql`and jurisdiction=${jurisdiction}` : sql``}
        order by lower(name),id`
    ).map((r) => r.id as string);
  const tiesById = (items: ForumRecord[]) => {
    const group = items.filter((f) => f.name.toLowerCase() === 'bb court').map((f) => f.id);
    expect(group).toEqual([...group].sort());
    return group.length;
  };

  it('walks every active forum once across ties at a page boundary', async () => {
    const pages = await walk({});
    expect(pages.map((p) => p.items.length)).toEqual([20, 20, 13]);
    expect(pages.at(-1)!.nextCursor).toBeNull();
    const items = pages.flatMap((p) => p.items);
    expect(items.map((f) => f.id)).toEqual(await expectedIds(false));
    expect(new Set(items.map((f) => f.id)).size).toBe(53);
    expect(tiesById(items)).toBe(12);
    // The first page ends inside the tie group, so its cursor names the tied name.
    expect(pages[0]!.nextCursor!.afterName.toLowerCase()).toBe('bb court');
    expect(items.every((f) => !f.archived && f.firmId === pagingFirm)).toBe(true);
  });

  it('pages a jurisdiction filter and stops exactly at twenty', async () => {
    const ca = await walk({ jurisdiction: 'CA' });
    expect(ca.map((p) => p.items.length)).toEqual([20, 3]);
    const caItems = ca.flatMap((p) => p.items);
    expect(caItems.map((f) => f.id)).toEqual(await expectedIds(false, 'CA'));
    expect(caItems.every((f) => f.jurisdiction === 'CA')).toBe(true);
    const tx = await walk({ jurisdiction: 'TX' });
    expect(tx.map((p) => p.items.length)).toEqual([20]);
    expect(tx[0]!.nextCursor).toBeNull();
    expect(tx[0]!.items.map((f) => f.id)).toEqual(await expectedIds(false, 'TX'));
  });

  it('lists archived forums apart from active ones, with filters and ties', async () => {
    const archived = (await walk({ status: 'archived' })).flatMap((p) => p.items);
    expect(archived.map((f) => f.id)).toEqual(await expectedIds(true));
    expect(archived).toHaveLength(4);
    expect(archived.every((f) => f.archived)).toBe(true);
    const caArchived = (await walk({ status: 'archived', jurisdiction: 'CA' })).flatMap(
      (p) => p.items,
    );
    expect(caArchived).toHaveLength(3);
    expect(tiesById(caArchived)).toBe(3);
    const explicit = (await walk({ status: 'active' })).flatMap((p) => p.items);
    expect(explicit.some((f) => f.archived)).toBe(false);
    expect(explicit).toHaveLength(53);
    expect((await forums({ jurisdiction: 'VI' }, 7)).items).toEqual([]);
  });

  it('refuses malformed list queries as invalid requests', async () => {
    const id = randomUUID();
    for (const query of [
      'status=deleted',
      'jurisdiction=ZZ',
      'jurisdiction=CA&jurisdiction=NY',
      `afterName=Bb%20Court`,
      `afterId=${id}`,
      'afterName=Bb&afterId=not-a-uuid',
      `afterName=%00&afterId=${id}`,
      `afterName=&afterId=${id}`,
      'firmId=x',
    ])
      await refused(api('GET', `/forums?${query}`, 7), 422);
  });
});

describe('unavailable records look identical', () => {
  let foreignForum: string, foreignMatter: string, foreignReference: string;
  beforeAll(async () => {
    foreignForum = (
      await forum(6, { name: 'Edge foreign court', kind: 'court', jurisdiction: 'MD' })
    ).forum.id;
    foreignMatter = randomUUID();
    await sql`insert into matters(id,firm_id,title,created_by) values (${foreignMatter},${otherFirm},'Edge foreign matter',${users[6]!})`;
    await sql`insert into matter_access(firm_id,matter_id,user_id,role,created_by)
      values (${otherFirm},${foreignMatter},${users[6]!},'manager',${users[6]!})`;
    foreignReference = (
      await add(foreignMatter, { purpose: 'venue', jurisdiction: 'MD', forumId: foreignForum }, 6)
    ).reference.id;
  });

  it('answers a foreign forum exactly as a forum that does not exist', async () => {
    const missing = randomUUID();
    for (const index of [0, 2]) {
      const foreign = await outcome(
        api('PATCH', forumPath(foreignForum), index, { expectedRevision: 1, archived: true }),
      );
      expect(
        await outcome(
          api('PATCH', forumPath(missing), index, { expectedRevision: 1, archived: true }),
        ),
      ).toEqual(foreign);
      expect(foreign.status).toBe(index === 0 ? 404 : 403);
    }
    const m = await matter('Edge foreign forum');
    const viaForeign = await outcome(
      api('POST', refsPath(m), 0, { purpose: 'venue', jurisdiction: 'MD', forumId: foreignForum }),
    );
    expect(viaForeign).toEqual({
      status: 404,
      code: 'FORUM_UNAVAILABLE',
      message: 'This forum is unavailable.',
    });
    expect(
      await outcome(
        api('POST', refsPath(m), 0, { purpose: 'venue', jurisdiction: 'MD', forumId: missing }),
      ),
    ).toEqual(viaForeign);
    // Even when the jurisdiction does not match the hidden forum's.
    expect(
      await outcome(
        api('POST', refsPath(m), 0, {
          purpose: 'venue',
          jurisdiction: 'VA',
          forumId: foreignForum,
        }),
      ),
    ).toEqual(viaForeign);
    expect(await currentCount(m)).toBe(0);
    const [unchanged] = await sql`select revision,archived_at from forums where id=${foreignForum}`;
    expect(unchanged).toEqual({ revision: 1, archived_at: null });
  });

  it('answers a foreign matter or reference exactly as one that does not exist', async () => {
    const missing = randomUUID();
    for (const [method, path, body] of [
      ['GET', refsPath, undefined],
      ['POST', refsPath, { purpose: 'governing_law', jurisdiction: 'MD' }],
      ['POST', endPath, { referenceId: foreignReference }],
    ] as const)
      expect(await outcome(api(method, path(foreignMatter), 0, body))).toEqual(
        await outcome(api(method, path(missing), 0, body)),
      );
    const m = await matter('Edge foreign reference');
    const foreign = await outcome(api('POST', endPath(m), 0, { referenceId: foreignReference }));
    expect(foreign).toEqual({
      status: 404,
      code: 'REFERENCE_UNAVAILABLE',
      message: 'This jurisdiction reference is unavailable.',
    });
    expect(await outcome(api('POST', endPath(m), 0, { referenceId: missing }))).toEqual(foreign);
    const [still] =
      await sql`select deleted_at from matter_jurisdictions where id=${foreignReference}`;
    expect(still).toEqual({ deleted_at: null });
  });

  it('hides a deleted matter and its references exactly like a missing matter', async () => {
    const m = await matter('Edge deleted matter', [
      [0, 'manager'],
      [2, 'manager'],
    ]);
    const r = await add(m, { purpose: 'venue', jurisdiction: 'ME', docketNumber: 'GONE-9' });
    await sql`update matters set deleted_at=now() where id=${m}`;
    const missing = randomUUID();
    for (const [method, path, body] of [
      ['GET', refsPath, undefined],
      ['POST', refsPath, { purpose: 'governing_law', jurisdiction: 'ME' }],
      ['POST', endPath, { referenceId: r.reference.id }],
    ] as const) {
      const deleted = await outcome(api(method, path(m), 2, body));
      expect(deleted.code).toBe('MATTER_UNAVAILABLE');
      expect(await outcome(api(method, path(missing), 2, body))).toEqual(deleted);
    }
    expect(
      await readAs(2, (tx) => tx`select id from matter_jurisdictions where matter_id=${m}`),
    ).toEqual([]);
    expect(await currentCount(m)).toBe(1);
  });

  it('refuses every route on a revoked session', async () => {
    const m = await matter('Edge revoked session', [[3, 'manager']]);
    await sql`update auth.sessions set not_after=now() - interval '1 minute' where id=${sessions[3]!}`;
    try {
      for (const [method, path, body] of [
        ['GET', forumPath(), undefined],
        ['POST', forumPath(), { name: 'Edge session board', kind: 'agency', jurisdiction: 'MI' }],
        ['GET', refsPath(m), undefined],
        ['POST', refsPath(m), { purpose: 'governing_law', jurisdiction: 'MI' }],
      ] as const) {
        const r = await api(method, path, 3, body);
        expect([401, 403]).toContain(r.status);
      }
    } finally {
      await sql`update auth.sessions set not_after=null where id=${sessions[3]!}`;
    }
    expect(await currentCount(m)).toBe(0);
    expect(
      (await sql`select count(*)::int as n from forums where name='Edge session board'`)[0]!.n,
    ).toBe(0);
  });
});

describe('request hygiene', () => {
  const unstorable = ['Court\u0000', 'Court \ud800', '\udc00 Court', 'Co\udbff\udbffurt'];

  it('refuses unstorable forum names on create and rename as invalid requests', async () => {
    const f = (await forum(0, { name: 'Edge hygiene court', kind: 'court', jurisdiction: 'SC' }))
      .forum;
    for (const name of unstorable) {
      await refused(
        api('POST', forumPath(), 0, { name, kind: 'court', jurisdiction: 'SC' }),
        422,
        'INVALID_REQUEST',
      );
      await refused(
        api('PATCH', forumPath(f.id), 0, { expectedRevision: 1, name }),
        422,
        'INVALID_REQUEST',
      );
    }
    // A complete surrogate pair is ordinary text.
    const emoji = await forum(0, {
      name: 'Edge hygiene court ⚖️ 🏛',
      kind: 'court',
      jurisdiction: 'SC',
    });
    expect(emoji.forum.name).toBe('Edge hygiene court ⚖️ 🏛');
    expect(
      (
        await sql`select count(*)::int as n from forums where firm_id=${firm} and jurisdiction='SC'`
      )[0]!.n,
    ).toBe(2);
  });

  it('refuses unstorable dockets and labels as invalid requests', async () => {
    const m = await matter('Edge hygiene references');
    for (const text of unstorable) {
      await refused(
        api('POST', refsPath(m), 0, { purpose: 'venue', jurisdiction: 'SC', docketNumber: text }),
        422,
        'INVALID_REQUEST',
      );
      await refused(
        api('POST', refsPath(m), 0, { purpose: 'other', jurisdiction: 'SC', label: text }),
        422,
        'INVALID_REQUEST',
      );
    }
    expect(await currentCount(m)).toBe(0);
  });

  it('never fails with a server error on malformed or mis-encoded bodies', async () => {
    const m = await matter('Edge hygiene encoding');
    const invalidUtf8 = new Uint8Array([
      ...new TextEncoder().encode('{"purpose":"other","jurisdiction":"SC","label":"Seat '),
      0xff,
      0xfe,
      ...new TextEncoder().encode('"}'),
    ]);
    const mis = await raw('POST', refsPath(m), 0, invalidUtf8);
    expect(mis.status).toBeLessThan(500);
    const malformed = await raw('POST', forumPath(), 0, '{"name":');
    expect(malformed.status).toBe(400);
    const notObject = await raw('POST', refsPath(m), 0, '"governing_law"');
    expect(notObject.status).toBeGreaterThanOrEqual(400);
    expect(notObject.status).toBeLessThan(500);
  });

  it('refuses a body over the API limit with 413 on every write', async () => {
    const m = await matter('Edge hygiene size');
    const big = 'x'.repeat(150_000);
    const f = (await forum(0, { name: 'Edge size court', kind: 'court', jurisdiction: 'SD' }))
      .forum;
    for (const [method, path, body] of [
      ['POST', forumPath(), { name: big, kind: 'court', jurisdiction: 'SD' }],
      ['PATCH', forumPath(f.id), { expectedRevision: 1, name: big }],
      ['POST', refsPath(m), { purpose: 'other', jurisdiction: 'SD', label: big }],
      ['POST', endPath(m), { referenceId: randomUUID(), padding: big }],
    ] as const)
      await refused(api(method, path, 0, body), 413, 'PAYLOAD_TOO_LARGE');
    expect(await currentCount(m)).toBe(0);
    const [unchanged] = await sql`select revision from forums where id=${f.id}`;
    expect(unchanged).toEqual({ revision: 1 });
  });

  it('refuses a restore that would collide with an active forum of the same name', async () => {
    const f = (await forum(0, { name: 'Edge restore court', kind: 'court', jurisdiction: 'WV' }))
      .forum;
    await updateForum(0, f.id, { expectedRevision: 1, archived: true });
    await forum(2, { name: 'EDGE RESTORE COURT', kind: 'court', jurisdiction: 'WV' });
    await refused(
      api('PATCH', forumPath(f.id), 1, { expectedRevision: 2, archived: false }),
      409,
      'FORUM_NAME_TAKEN',
    );
    // A rename while archived clears the way back.
    await updateForum(1, f.id, { expectedRevision: 2, name: 'Edge restore court (old)' });
    const restored = await updateForum(1, f.id, { expectedRevision: 3, archived: false });
    expect(restored.forum).toMatchObject({ archived: false, revision: 4 });
  });
});
