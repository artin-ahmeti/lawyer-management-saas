import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { expect, it } from 'vitest';

it('preserves existing memberships and reverses only unused role revisions', async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local DB required');
  const admin = postgres(url.href, { max: 1 }),
    name = `clepso_access_${randomUUID().replaceAll('-', '')}`;
  await admin`create database ${admin(name)} template template0`;
  url.pathname = `/${name}`;
  const sql = postgres(url.href, { max: 1 }),
    root = new URL('../../../supabase/', import.meta.url);
  const apply = async (file: string) =>
    sql.unsafe(await readFile(new URL(file, root), 'utf8')).simple();
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
        .filter((f) => f.endsWith('.sql'))
        .sort(),
      cutoff = '20261008004318';
    for (const file of files.filter((f) => f < cutoff)) await apply(`migrations/${file}`);
    const user = randomUUID(),
      firm = randomUUID(),
      matter = randomUUID();
    await sql`insert into auth.users(id,email,email_confirmed_at) values (${user},'upgrade@access.test',now())`;
    await sql`insert into firms(id,name) values (${firm},'Existing firm')`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},'owner')`;
    await sql`insert into matters(id,firm_id,title,revision,created_by) values (${matter},${firm},'Preserved restricted matter',7,${user})`;
    await sql`insert into matter_access(firm_id,matter_id,user_id,role,revision,created_by) values (${firm},${matter},${user},'manager',3,${user})`;
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect(
      (
        await sql`select role,revision from firm_members where firm_id=${firm} and user_id=${user}`
      )[0],
    ).toEqual({ role: 'owner', revision: 1 });
    expect(
      (await sql`select title,revision,access_revision from matters where id=${matter}`)[0],
    ).toEqual({ title: 'Preserved restricted matter', revision: 7, access_revision: 1 });
    expect(
      (
        await sql`select relrowsecurity and relforcerowsecurity as secure from pg_class where oid='public.firm_members'::regclass`
      )[0]?.secure,
    ).toBe(true);
    await apply('rollbacks/20261008_staff_role_revision.sql');
    expect(
      (await sql`select role from firm_members where firm_id=${firm} and user_id=${user}`)[0]?.role,
    ).toBe('owner');
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    await expect(
      sql`update firm_members set revision=0 where firm_id=${firm}`,
    ).rejects.toMatchObject({ code: '23514' });
    await sql`update firm_members set role='admin',revision=2 where firm_id=${firm}`;
    await expect(apply('rollbacks/20261008_staff_role_revision.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
    expect((await sql`select role,revision from firm_members where firm_id=${firm}`)[0]).toEqual({
      role: 'admin',
      revision: 2,
    });
  } finally {
    await sql.end({ timeout: 5 });
    await admin`drop database ${admin(name)} with (force)`;
    await admin.end();
  }
});
