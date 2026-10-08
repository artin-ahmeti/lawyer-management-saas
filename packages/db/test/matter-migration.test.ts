import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { expect, it } from 'vitest';

it('preserves existing firms on upgrade, installs grant isolation, and refuses destructive used rollback', async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local DB required');
  const admin = postgres(url.href, { max: 1 }),
    name = `clepso_matters_${randomUUID().replaceAll('-', '')}`;
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
      .filter((f) => f.endsWith('.sql') && f <= '20261007233644_matter_access_security.sql')
      .sort();
    const cutoff = '20261007233643';
    for (const file of files.filter((f) => f < cutoff)) await apply(`migrations/${file}`);
    const user = randomUUID(),
      firm = randomUUID();
    await sql`insert into auth.users(id,email,email_confirmed_at) values (${user},'migration@matter.test',now())`;
    await sql`insert into firms(id,name,revision,settings) values (${firm},'Existing firm',8,'{"preserved":true}'::jsonb)`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},'owner')`;
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect((await sql`select name,revision,settings from firms where id=${firm}`)[0]).toEqual({
      name: 'Existing firm',
      revision: 8,
      settings: { preserved: true },
    });
    expect(
      (
        await sql`select bool_and(relrowsecurity and relforcerowsecurity) as secure from pg_class where oid in ('public.matters'::regclass,'public.matter_access'::regclass)`
      )[0]?.secure,
    ).toBe(true);
    await apply('rollbacks/20261007_matters_and_grants.sql');
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    const [matter] =
      await sql`insert into matters(firm_id,title,created_by) values (${firm},'No court engagement',${user}) returning id`;
    await expect(apply('rollbacks/20261007_matters_and_grants.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
    expect((await sql`select title from matters where id=${matter!.id}`)[0]?.title).toBe(
      'No court engagement',
    );
    await expect(
      sql`update matters set created_by=gen_random_uuid() where id=${matter!.id}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values (${firm},${matter!.id},${user},'manager',${user})`;
      }),
    ).rejects.toMatchObject({ code: '42501' });
  } finally {
    await sql.end({ timeout: 5 });
    await admin`drop database ${admin(name)} with (force)`;
    await admin.end();
  }
});
