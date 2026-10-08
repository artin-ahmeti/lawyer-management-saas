/**
 * Tenant-isolation suite (Plan §8) — the highest-leverage tests in the product.
 * Runs against the LOCAL supabase stack (pnpm supabase start) through PostgREST,
 * i.e. the exact surface the mobile app uses, with forged-but-validly-signed
 * JWTs. Blocking in CI.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ?? 'super-secret-jwt-token-with-at-least-32-characters-long';

const sql = postgres(DB_URL, { max: 2 });
const secret = new TextEncoder().encode(JWT_SECRET);

const FIRM_A = '00000000-0000-4000-a000-00000000000a';
const FIRM_B = '00000000-0000-4000-a000-00000000000b';
const USER_A = '00000000-0000-4000-b000-00000000000a';
const USER_B = '00000000-0000-4000-b000-00000000000b';
const MATTER_A = randomUUID(),
  MATTER_RESTRICTED = randomUUID(),
  MATTER_B = randomUUID();
const CONTACT_A = randomUUID(),
  CONTACT_B = randomUUID();

async function signToken(claims: Record<string, unknown>): Promise<string> {
  return new SignJWT({ aud: 'authenticated', iss: `${SUPABASE_URL}/auth/v1`, ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);
}

async function clientFor(
  userId: string,
  firmId: string,
  role = 'attorney',
): Promise<SupabaseClient> {
  const anon = await signToken({ role: 'anon' });
  const user = await signToken({
    sub: userId,
    role: 'authenticated',
    firm_id: firmId,
    user_role: role,
  });
  return createClient(SUPABASE_URL, anon, {
    global: { headers: { Authorization: `Bearer ${user}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

beforeAll(async () => {
  await cleanup();
  // Fixtures as superuser: two auth users (profiles auto-provision via trigger),
  // two firms, one membership each, one practice area each.
  for (const [id, email] of [
    [USER_A, 'a@firm-a.test'],
    [USER_B, 'b@firm-b.test'],
  ] as const) {
    await sql`
      insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at)
      values ('00000000-0000-0000-0000-000000000000', ${id}, 'authenticated', 'authenticated',
              ${email}, now(), now(), now())`;
  }
  await sql`insert into public.firms (id, name, subdomain) values
    (${FIRM_A}, 'Firm A LLP', 'firm-a-test'), (${FIRM_B}, 'Firm B LLC', 'firm-b-test')`;
  await sql`insert into public.firm_members (firm_id, user_id, role) values
    (${FIRM_A}, ${USER_A}, 'owner'), (${FIRM_B}, ${USER_B}, 'owner')`;
  await sql`insert into public.practice_areas (firm_id, name) values
    (${FIRM_A}, 'Personal Injury'), (${FIRM_B}, 'Immigration')`;
  await sql`insert into public.matters(id,firm_id,title,created_by) values
    (${MATTER_A},${FIRM_A},'Granted engagement',${USER_A}),
    (${MATTER_RESTRICTED},${FIRM_A},'Restricted engagement',${USER_A}),
    (${MATTER_B},${FIRM_B},'Other firm engagement',${USER_B})`;
  await sql`insert into public.matter_access(firm_id,matter_id,user_id,role,created_by) values
    (${FIRM_A},${MATTER_A},${USER_A},'manager',${USER_A}),
    (${FIRM_B},${MATTER_B},${USER_B},'manager',${USER_B})`;
  await sql`insert into public.contacts(id,firm_id,kind,display_name,created_by) values
    (${CONTACT_A},${FIRM_A},'person','Firm A client',${USER_A}),
    (${CONTACT_B},${FIRM_B},'organization','Firm B client',${USER_B})`;
  await sql`insert into public.matter_parties(firm_id,matter_id,contact_id,role,created_by) values
    (${FIRM_A},${MATTER_A},${CONTACT_A},'client',${USER_A}),
    (${FIRM_A},${MATTER_RESTRICTED},${CONTACT_A},'client',${USER_A}),
    (${FIRM_B},${MATTER_B},${CONTACT_B},'client',${USER_B})`;
}, 30_000);

afterAll(async () => {
  await cleanup();
  await sql.end();
});

async function cleanup(): Promise<void> {
  await sql`delete from public.matter_parties where firm_id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from public.contacts where firm_id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from public.matter_access where firm_id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from public.matters where firm_id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from public.practice_areas where firm_id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from public.firm_members where firm_id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from public.firms where id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from auth.users where id in (${USER_A}, ${USER_B})`;
}

describe('cross-firm read isolation', () => {
  it('filters matter records, grants and exact counts by explicit access even for owners', async () => {
    const a = await clientFor(USER_A, FIRM_A, 'owner');
    const read = await a.from('matters').select('id', { count: 'exact' });
    expect(read.error).toBeNull();
    expect(read.data).toEqual([{ id: MATTER_A }]);
    expect(read.count).toBe(1);
    const grants = await a.from('matter_access').select('matter_id');
    expect(grants.error).toBeNull();
    expect(grants.data).toEqual([{ matter_id: MATTER_A }]);
    const forged = await clientFor(USER_A, FIRM_B, 'owner');
    const foreign = await forged.from('matters').select('id', { count: 'exact' });
    expect(foreign.error).toBeNull();
    expect(foreign.data).toEqual([]);
    expect(foreign.count).toBe(0);
    const restricted = await a.from('matters').select('id').eq('id', MATTER_RESTRICTED);
    expect(restricted.error).toBeNull();
    expect(restricted.data).toEqual([]);
  });
  it('removes matter records and counts when a grant is revoked despite a still-valid token', async () => {
    const a = await clientFor(USER_A, FIRM_A, 'owner');
    await sql`update matter_access set deleted_at=now() where matter_id=${MATTER_A} and user_id=${USER_A}`;
    try {
      const read = await a.from('matters').select('id', { count: 'exact' });
      expect(read.error).toBeNull();
      expect(read.data).toEqual([]);
      expect(read.count).toBe(0);
      const grants = await a.from('matter_access').select('id');
      expect(grants.error).toBeNull();
      expect(grants.data).toEqual([]);
    } finally {
      await sql`update matter_access set deleted_at=null where matter_id=${MATTER_A} and user_id=${USER_A}`;
    }
  });
  it('rejects direct matter/grant writes and anonymous reads', async () => {
    const a = await clientFor(USER_A, FIRM_A, 'owner');
    const create = await a
      .from('matters')
      .insert({ firm_id: FIRM_A, title: 'Forbidden', created_by: USER_A });
    expect(create.error?.code).toBe('42501');
    const grant = await a.from('matter_access').insert({
      firm_id: FIRM_A,
      matter_id: MATTER_RESTRICTED,
      user_id: USER_A,
      role: 'manager',
      created_by: USER_A,
    });
    expect(grant.error?.code).toBe('42501');
    const update = await a
      .from('matter_access')
      .update({ role: 'manager' })
      .eq('matter_id', MATTER_A);
    expect(update.error?.code).toBe('42501');
    const anon = createClient(SUPABASE_URL, await signToken({ role: 'anon' }), {
      auth: { persistSession: false },
    });
    expect((await anon.from('matters').select('id')).error?.code).toBe('42501');
  });
  it('scopes the contact directory to the firm and party links to granted matters', async () => {
    const a = await clientFor(USER_A, FIRM_A, 'owner');
    const directory = await a.from('contacts').select('id', { count: 'exact' });
    expect(directory.error).toBeNull();
    expect(directory.data).toEqual([{ id: CONTACT_A }]);
    expect(directory.count).toBe(1);
    const parties = await a.from('matter_parties').select('matter_id', { count: 'exact' });
    expect(parties.error).toBeNull();
    expect(parties.data).toEqual([{ matter_id: MATTER_A }]);
    expect(parties.count).toBe(1);
    const forged = await clientFor(USER_A, FIRM_B, 'owner');
    for (const table of ['contacts', 'matter_parties']) {
      const foreign = await forged.from(table).select('id', { count: 'exact' });
      expect(foreign.error).toBeNull();
      expect(foreign.count).toBe(0);
    }
  });
  it('rejects direct contact/party writes and anonymous reads', async () => {
    const a = await clientFor(USER_A, FIRM_A, 'owner');
    const create = await a
      .from('contacts')
      .insert({ firm_id: FIRM_A, kind: 'person', display_name: 'Forbidden', created_by: USER_A });
    expect(create.error?.code).toBe('42501');
    const rename = await a.from('contacts').update({ display_name: 'X' }).eq('id', CONTACT_A);
    expect(rename.error?.code).toBe('42501');
    const link = await a.from('matter_parties').insert({
      firm_id: FIRM_A,
      matter_id: MATTER_A,
      contact_id: CONTACT_A,
      role: 'adverse_party',
      created_by: USER_A,
    });
    expect(link.error?.code).toBe('42501');
    const end = await a
      .from('matter_parties')
      .update({ deleted_at: new Date().toISOString() })
      .eq('matter_id', MATTER_A);
    expect(end.error?.code).toBe('42501');
    const anon = createClient(SUPABASE_URL, await signToken({ role: 'anon' }), {
      auth: { persistSession: false },
    });
    for (const table of ['contacts', 'matter_parties'])
      expect((await anon.from(table).select('id')).error?.code).toBe('42501');
  });
  it('keeps invitation identities and membership writes behind the API for members and anonymous clients', async () => {
    const clients = [
      await clientFor(USER_A, FIRM_A),
      await clientFor(USER_A, FIRM_B),
      createClient(SUPABASE_URL, await signToken({ role: 'anon' }), {
        auth: { persistSession: false },
      }),
    ];
    for (const client of clients) {
      const read = await client.from('staff_invitations').select('*');
      expect(read.error?.code).toBe('42501');
      const preparation = await client.from('staff_invitations').insert({
        firm_id: FIRM_A,
        email: 'recipient@test.local',
        role: 'owner',
        created_by: USER_A,
        expires_at: '2026-10-14T12:00:00Z',
      });
      expect(preparation.error?.code).toBe('42501');
      const acceptance = await client
        .from('staff_invitations')
        .update({ status: 'accepted' })
        .eq('firm_id', FIRM_A);
      expect(acceptance.error?.code).toBe('42501');
    }
    const [permissions] =
      await sql`select has_table_privilege('service_role','staff_invitations','DELETE') as can_delete`;
    expect(permissions?.can_delete).toBe(false);
  });
  it('keeps recovery reasons and command provenance inaccessible to clients', async () => {
    for (const client of [
      await clientFor(USER_A, FIRM_A),
      await clientFor(USER_A, FIRM_B),
      createClient(SUPABASE_URL, await signToken({ role: 'anon' }), {
        auth: { persistSession: false },
      }),
    ]) {
      expect((await client.from('execution_recoveries').select('*')).error?.code).toBe('42501');
      expect(
        (await client.from('execution_recoveries').insert({ id: FIRM_A, firm_id: FIRM_A })).error
          ?.code,
      ).toBe('42501');
    }
    expect(
      (
        await sql`select has_table_privilege('service_role', 'execution_recoveries', 'UPDATE') or has_table_privilege('service_role', 'execution_recoveries', 'DELETE') as can_rewrite`
      )[0]?.can_rewrite,
    ).toBe(false);
  });
  it('keeps attempt history server-only for members, forged firm claims and anonymous clients', async () => {
    for (const client of [
      await clientFor(USER_A, FIRM_A),
      await clientFor(USER_A, FIRM_B),
      createClient(SUPABASE_URL, await signToken({ role: 'anon' }), {
        auth: { persistSession: false },
      }),
    ]) {
      const { data, error } = await client.from('job_execution_attempts').select('*');
      expect(data).toBeNull();
      expect(error?.code).toBe('42501');
      const write = await client.from('job_execution_attempts').insert({
        job_id: FIRM_A,
        firm_id: FIRM_A,
        created_by: USER_A,
        attempt_number: 1,
        lease_token: FIRM_A,
        lease_until: '2026-10-06T10:30:00.000Z',
      });
      expect(write.error?.code).toBe('42501');
    }
    expect(
      (
        await sql`select has_table_privilege('service_role', 'public.job_execution_attempts', 'DELETE') as can_delete`
      )[0]?.can_delete,
    ).toBe(false);
  });
  it('a member sees only their own firm', async () => {
    const a = await clientFor(USER_A, FIRM_A);
    const { data, error } = await a.from('firms').select('id, name');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(FIRM_A);
  });

  it("firm A cannot read firm B's practice areas", async () => {
    const a = await clientFor(USER_A, FIRM_A);
    const { data, error } = await a.from('practice_areas').select('id, firm_id');
    expect(error).toBeNull();
    expect(data?.every((r) => r.firm_id === FIRM_A)).toBe(true);
    expect(data?.some((r) => r.firm_id === FIRM_B)).toBe(false);
  });

  it("firm A cannot read firm B's memberships", async () => {
    const a = await clientFor(USER_A, FIRM_A);
    const { data } = await a.from('firm_members').select('firm_id');
    expect(data?.every((r) => r.firm_id === FIRM_A)).toBe(true);
  });

  it('a forged token for firm B still cannot leak firm A rows', async () => {
    // USER_B legitimately belongs to firm B; claims say firm B → only firm B visible.
    const b = await clientFor(USER_B, FIRM_B);
    const { data } = await b.from('firms').select('id');
    expect(data?.map((r) => r.id)).toEqual([FIRM_B]);
  });

  it('anon sees nothing', async () => {
    const anon = await signToken({ role: 'anon' });
    const c = createClient(SUPABASE_URL, anon, { auth: { persistSession: false } });
    const { data } = await c.from('firms').select('id');
    expect(data ?? []).toHaveLength(0);
  });
});

describe('the write-path rule: clients cannot write, period', () => {
  it('insert is rejected by grants (42501), not just by policy', async () => {
    const a = await clientFor(USER_A, FIRM_A, 'owner');
    const { error } = await a
      .from('practice_areas')
      .insert({ firm_id: FIRM_A, name: 'Should Never Exist' });
    expect(error?.code).toBe('42501'); // permission denied
  });

  it('update is rejected even on own-firm rows', async () => {
    const a = await clientFor(USER_A, FIRM_A, 'owner');
    const { error } = await a.from('firms').update({ name: 'Hacked LLP' }).eq('id', FIRM_A);
    expect(error?.code).toBe('42501');
  });

  it('delete is rejected', async () => {
    const a = await clientFor(USER_A, FIRM_A, 'owner');
    const { error } = await a.from('practice_areas').delete().eq('firm_id', FIRM_A);
    expect(error?.code).toBe('42501');
  });
});

describe('custom access token hook', () => {
  it('stamps firm_id and user_role claims from firm_members', async () => {
    const [row] = await sql`
      select public.custom_access_token_hook(
        jsonb_build_object('user_id', ${USER_A}::text, 'claims', '{}'::jsonb)
      ) as event`;
    const claims = (row?.event as { claims: Record<string, string> }).claims;
    expect(claims.firm_id).toBe(FIRM_A);
    expect(claims.user_role).toBe('owner');
  });

  it('leaves claims untouched for a user with no membership', async () => {
    const orphan = '00000000-0000-4000-b000-0000000000ff';
    const [row] = await sql`
      select public.custom_access_token_hook(
        jsonb_build_object('user_id', ${orphan}::text, 'claims', '{}'::jsonb)
      ) as event`;
    const claims = (row?.event as { claims: Record<string, string> }).claims;
    expect(claims.firm_id).toBeUndefined();
  });
});

describe('current membership, even with an unexpired token', () => {
  it('a deleted firm is neither readable nor stamped into a refreshed token', async () => {
    const a = await clientFor(USER_A, FIRM_A);
    await sql`update public.firms set deleted_at = now() where id = ${FIRM_A}`;
    try {
      const { data, error } = await a.from('practice_areas').select('id');
      expect(error).toBeNull();
      expect(data).toEqual([]);
      const [row] = await sql`select public.custom_access_token_hook(
        jsonb_build_object('user_id', ${USER_A}::text, 'claims', '{}'::jsonb)
      ) as event`;
      expect(row?.event.claims.firm_id).toBeUndefined();
    } finally {
      await sql`update public.firms set deleted_at = null where id = ${FIRM_A}`;
    }
  });

  it('a token claiming another firm cannot read that firm without membership', async () => {
    const a = await clientFor(USER_A, FIRM_B, 'owner');
    const { data, error } = await a.from('firms').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('revocation immediately removes firm, colleague and practice-area reads', async () => {
    const a = await clientFor(USER_A, FIRM_A, 'owner');
    await sql`update public.firm_members set deleted_at = now()
      where firm_id = ${FIRM_A} and user_id = ${USER_A}`;
    try {
      for (const table of ['firms', 'firm_members', 'practice_areas']) {
        const { data, error } = await a.from(table).select('id');
        expect(error).toBeNull();
        expect(data, table).toEqual([]);
      }
    } finally {
      await sql`update public.firm_members set deleted_at = null
        where firm_id = ${FIRM_A} and user_id = ${USER_A}`;
    }
  });

  it('token refresh removes stale firm claims after revocation', async () => {
    await sql`update public.firm_members set deleted_at = now()
      where firm_id = ${FIRM_A} and user_id = ${USER_A}`;
    try {
      const [row] = await sql`select public.custom_access_token_hook(
        jsonb_build_object('user_id', ${USER_A}::text, 'claims',
          jsonb_build_object('sub', ${USER_A}::text, 'firm_id', ${FIRM_A}::text,
            'user_role', 'owner'))
      ) as event`;
      expect(row?.event.claims).toEqual({ sub: USER_A });
    } finally {
      await sql`update public.firm_members set deleted_at = null
        where firm_id = ${FIRM_A} and user_id = ${USER_A}`;
    }
  });
});
