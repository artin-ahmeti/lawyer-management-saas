/**
 * Tenant-isolation suite (Plan §8) — the highest-leverage tests in the product.
 * Runs against the LOCAL supabase stack (pnpm supabase start) through PostgREST,
 * i.e. the exact surface the mobile app uses, with forged-but-validly-signed
 * JWTs. Blocking in CI.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
}, 30_000);

afterAll(async () => {
  await cleanup();
  await sql.end();
});

async function cleanup(): Promise<void> {
  await sql`delete from public.practice_areas where firm_id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from public.firm_members where firm_id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from public.firms where id in (${FIRM_A}, ${FIRM_B})`;
  await sql`delete from auth.users where id in (${USER_A}, ${USER_B})`;
}

describe('cross-firm read isolation', () => {
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
