import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { expect, it } from 'vitest';

it('adds contacts and party links beside existing matters, guards history and refuses used rollback', async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local DB required');
  const admin = postgres(url.href, { max: 1 }),
    name = `clepso_contacts_${randomUUID().replaceAll('-', '')}`;
  await admin`create database ${admin(name)} template template0`;
  url.pathname = `/${name}`;
  const sql = postgres(url.href, { max: 1 }),
    root = new URL('../../../supabase/', import.meta.url);
  const apply = async (file: string) =>
    sql.unsafe(await readFile(new URL(file, root), 'utf8')).simple();
  const rollback = 'rollbacks/20261008_contacts_and_parties.sql';
  const tables = async () =>
    (
      await sql`select count(*)::int as n from pg_class where oid in
        (to_regclass('public.contacts'),to_regclass('public.matter_parties'))
        and relrowsecurity and relforcerowsecurity`
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
        .filter((f) => f.endsWith('.sql') && f <= '20261008181024_contact_security.sql')
        .sort(),
      cutoff = '20261008181023';
    for (const file of files.filter((f) => f < cutoff)) await apply(`migrations/${file}`);
    const user = randomUUID(),
      firm = randomUUID(),
      matter = randomUUID();
    await sql`insert into auth.users(id,email,email_confirmed_at) values (${user},'migration@contact.test',now())`;
    await sql`insert into firms(id,name) values (${firm},'Existing firm')`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},'owner')`;
    await sql`insert into matters(id,firm_id,title,revision,created_by) values (${matter},${firm},'Existing advisory',3,${user})`;
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect(await tables()).toBe(2);
    expect((await sql`select title,revision from matters where id=${matter}`)[0]).toEqual({
      title: 'Existing advisory',
      revision: 3,
    });

    await apply(rollback);
    expect(await tables()).toBe(0);
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect(await tables()).toBe(2);

    const [contact] =
      await sql`insert into contacts(firm_id,kind,display_name,created_by) values (${firm},'organization','Acme LLC',${user}) returning id`;
    const party = (role: string, label: string | null, deletedAt: Date | null = null) =>
      sql`insert into matter_parties(firm_id,matter_id,contact_id,role,label,created_by,deleted_at)
        values (${firm},${matter},${contact!.id},${role},${label},${user},${deletedAt}) returning id`;
    await expect(party('other', null)).rejects.toMatchObject({ code: '23514' });
    await expect(party('client', null, new Date())).rejects.toMatchObject({ code: '42501' });
    const [link] = await party('client', null);
    await expect(party('adverse_party', null)).rejects.toMatchObject({ code: '23505' });
    await expect(
      sql`update matter_parties set role='other',label='Lender' where id=${link!.id}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql`update matter_parties set deleted_at=created_at - interval '1 day' where id=${link!.id}`,
    ).rejects.toMatchObject({ code: '42501' });
    await sql`update matter_parties set deleted_at=clock_timestamp() where id=${link!.id}`;
    await expect(
      sql`update matter_parties set deleted_at=null where id=${link!.id}`,
    ).rejects.toMatchObject({ code: '42501' });
    expect((await party('adverse_party', null)).length).toBe(1);
    await expect(
      sql`update contacts set kind='person' where id=${contact!.id}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`insert into contacts(firm_id,kind,display_name,created_by) values (${firm},'person','Client write',${user})`;
      }),
    ).rejects.toMatchObject({ code: '42501' });

    await expect(apply(rollback)).rejects.toThrow('Rollback refused');
    await sql`rollback`;
    expect(await tables()).toBe(2);
    expect((await sql`select count(*)::int as n from matter_parties`)[0]?.n).toBe(2);
  } finally {
    await sql.end({ timeout: 5 });
    await admin`drop database ${admin(name)} with (force)`;
    await admin.end();
  }
});
