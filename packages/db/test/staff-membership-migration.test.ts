import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { expect, it } from 'vitest';

it('adds the membership history index without touching memberships, and reverses cleanly', async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local DB required');
  const admin = postgres(url.href, { max: 1 }),
    name = `clepso_membership_${randomUUID().replaceAll('-', '')}`;
  await admin`create database ${admin(name)} template template0`;
  url.pathname = `/${name}`;
  const sql = postgres(url.href, { max: 1 }),
    root = new URL('../../../supabase/', import.meta.url);
  const apply = async (file: string) =>
    sql.unsafe(await readFile(new URL(file, root), 'utf8')).simple();
  const indexed = async () =>
    (
      await sql`select count(*)::int as n from pg_indexes where indexname='audit_logs_staff_membership_history_idx'
        and indexdef like '%staff.membership.remove.v1%' and indexdef like '%staff.membership.restore.v1%'
        and indexdef like '%firm_member%'`
    )[0]?.n;
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
        .filter((f) => f.endsWith('.sql') && f <= '20261008170109_outgoing_sage.sql')
        .sort(),
      cutoff = '20261008170109';
    for (const file of files.filter((f) => f < cutoff)) await apply(`migrations/${file}`);
    const owner = randomUUID(),
      former = randomUUID(),
      firm = randomUUID();
    await sql`insert into auth.users(id,email,email_confirmed_at) values (${owner},'owner@membership.test',now()),(${former},'former@membership.test',now())`;
    await sql`insert into firms(id,name) values (${firm},'Existing firm')`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${owner},'owner')`;
    await sql`insert into firm_members(firm_id,user_id,role,revision,deleted_at) values (${firm},${former},'attorney',4,now())`;
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect(await indexed()).toBe(1);
    const preserved = async () =>
      sql`select role,revision,deleted_at is not null as removed from firm_members where firm_id=${firm} order by role`;
    expect(await preserved()).toEqual([
      { role: 'owner', revision: 1, removed: false },
      { role: 'attorney', revision: 4, removed: true },
    ]);
    await apply('rollbacks/20261008_staff_membership_history.sql');
    expect(await indexed()).toBe(0);
    expect(await preserved()).toHaveLength(2);
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect(await indexed()).toBe(1);
    expect(await preserved()).toHaveLength(2);
  } finally {
    await sql.end({ timeout: 5 });
    await admin`drop database ${admin(name)} with (force)`;
    await admin.end();
  }
});
