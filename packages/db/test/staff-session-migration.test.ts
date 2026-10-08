import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { expect, it } from 'vitest';

it('upgrades a populated firm, isolates context writes and reverses only an unused selection upgrade', async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Local database required');
  const admin = postgres(url.href, { max: 1 }),
    name = `clepso_session_${randomUUID().replaceAll('-', '')}`;
  await admin`create database ${admin(name)} template template0`;
  url.pathname = `/${name}`;
  const sql = postgres(url.href, { max: 1 }),
    root = new URL('../../../supabase/', import.meta.url);
  const apply = async (path: string) =>
    sql.unsafe(await readFile(new URL(path, root), 'utf8')).simple();
  try {
    await sql
      .unsafe(
        `create schema auth;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
      create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;`,
      )
      .simple();
    const files = (await readdir(new URL('migrations/', root)))
      .filter((f) => f.endsWith('.sql') && f <= '20261007225254_staff_session_context_security.sql')
      .sort();
    const cutoff = '20261007225253';
    for (const file of files.filter((f) => f < cutoff)) await apply(`migrations/${file}`);
    const user = randomUUID(),
      firm = randomUUID(),
      session = randomUUID();
    await sql`insert into auth.users(id,email,email_confirmed_at) values (${user},'migration@test.local',now())`;
    await sql`insert into auth.sessions(id,user_id) values (${session},${user})`;
    await sql`insert into firms(id,name,revision,settings) values (${firm},'Preserved firm',9,'{"keep":true}'::jsonb)`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},'readonly')`;
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect((await sql`select name,revision,settings from firms where id=${firm}`)[0]).toEqual({
      name: 'Preserved firm',
      revision: 9,
      settings: { keep: true },
    });
    await apply('rollbacks/20261007_staff_session_contexts.sql');
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect(
      (
        await sql`select relrowsecurity,relforcerowsecurity from pg_class where oid='public.staff_session_contexts'::regclass`
      )[0],
    ).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    await expect(
      sql.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`select * from staff_session_contexts`;
      }),
    ).rejects.toMatchObject({ code: '42501' });
    await sql`insert into staff_session_contexts(session_id,firm_id,revision,created_by) values (${session},${firm},1,${user})`;
    await expect(
      sql`update staff_session_contexts set revision=3 where session_id=${session}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql`update staff_session_contexts set session_id=${randomUUID()},revision=2 where session_id=${session}`,
    ).rejects.toMatchObject({ code: '42501' });
    expect(
      (
        await sql`select app.staff_session_authorized(${session},${user},${firm},null) as allowed`
      )[0]?.allowed,
    ).toBe(false);
    expect(
      (await sql`select app.staff_session_authorized(${session},${user},${firm},1) as allowed`)[0]
        ?.allowed,
    ).toBe(true);
    await expect(apply('rollbacks/20261007_staff_session_contexts.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
    const key = randomUUID();
    await sql`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response) values (gen_random_uuid(),${firm},${user},'staff.context.select.v1',${key},gen_random_uuid(),'hash','{}'::jsonb)`;
    await sql`delete from staff_session_contexts`; // disposable database only
    await expect(apply('rollbacks/20261007_staff_session_contexts.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
    await sql`delete from command_receipts`;
    await apply('rollbacks/20261007_staff_session_contexts.sql');
    expect((await sql`select name,revision from firms where id=${firm}`)[0]).toEqual({
      name: 'Preserved firm',
      revision: 9,
    });
  } finally {
    await sql.end();
    await admin`drop database ${admin(name)}`;
    await admin.end();
  }
}, 40000);
