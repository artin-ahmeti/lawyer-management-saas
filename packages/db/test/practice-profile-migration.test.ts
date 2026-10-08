import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { expect, it } from 'vitest';

it('adds profiles, immutable versions and pinned matter values beside existing matters and refuses used rollback', async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local DB required');
  const admin = postgres(url.href, { max: 1 }),
    name = `clepso_profiles_${randomUUID().replaceAll('-', '')}`;
  await admin`create database ${admin(name)} template template0`;
  url.pathname = `/${name}`;
  const sql = postgres(url.href, { max: 1 }),
    root = new URL('../../../supabase/', import.meta.url);
  const apply = async (file: string) =>
    sql.unsafe(await readFile(new URL(file, root), 'utf8')).simple();
  const rollback = 'rollbacks/20261008_practice_profiles.sql';
  const tables = async () =>
    (
      await sql`select count(*)::int as n from pg_class where oid in
        (to_regclass('public.practice_profiles'),to_regclass('public.practice_profile_versions'))
        and relrowsecurity and relforcerowsecurity`
    )[0]?.n;
  const matterColumns = async () =>
    (
      await sql`select count(*)::int as n from information_schema.columns
        where table_schema='public' and table_name='matters'
          and column_name in ('profile_version_id','field_values')`
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
        .filter((f) => f.endsWith('.sql') && f <= '20261008190311_practice_profile_security.sql')
        .sort(),
      cutoff = '20261008190310';
    for (const file of files.filter((f) => f < cutoff)) await apply(`migrations/${file}`);
    const user = randomUUID(),
      firm = randomUUID(),
      otherFirm = randomUUID(),
      matter = randomUUID();
    await sql`insert into auth.users(id,email,email_confirmed_at) values (${user},'migration@profile.test',now())`;
    await sql`insert into firms(id,name) values (${firm},'Existing firm'),(${otherFirm},'Other firm')`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},'owner')`;
    await sql`insert into matters(id,firm_id,title,revision,created_by) values (${matter},${firm},'Existing advisory',3,${user})`;
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect(await tables()).toBe(2);
    expect(
      (
        await sql`select title,revision,profile_version_id,field_values from matters where id=${matter}`
      )[0],
    ).toEqual({
      title: 'Existing advisory',
      revision: 3,
      profile_version_id: null,
      field_values: {},
    });

    await apply(rollback);
    expect(await tables()).toBe(0);
    expect(await matterColumns()).toBe(0);
    expect((await sql`select revision from matters where id=${matter}`)[0]?.revision).toBe(3);
    for (const file of files.filter((f) => f >= cutoff)) await apply(`migrations/${file}`);
    expect(await tables()).toBe(2);
    expect(await matterColumns()).toBe(2);

    // A profile and its first version are written together; the current version must exist.
    const published = (firmId: string, profileName: string, archived = false) =>
      sql.begin(async (tx) => {
        const [row] = await tx`insert into practice_profiles(firm_id,name,archived_at,created_by)
          values (${firmId},${profileName},${archived ? new Date() : null},${user}) returning id`;
        await tx`insert into practice_profile_versions(firm_id,profile_id,version,fields,created_by)
          values (${firmId},${row!.id},1,${tx.json([{ key: 'entity_name', label: 'Entity', type: 'text', required: false }] as never)},${user})`;
        return row!;
      });
    await expect(
      sql`insert into practice_profiles(firm_id,name,created_by) values (${firm},'No version',${user})`,
    ).rejects.toMatchObject({ code: '23503' });
    const deals = await published(firm, 'Deals');
    await expect(published(firm, 'DEALS')).rejects.toMatchObject({ code: '23505' });
    await published(firm, 'deals', true);
    const foreignProfile = await published(otherFirm, 'Deals');
    await expect(
      sql`insert into practice_profiles(firm_id,name,based_on_key,created_by) values (${firm},'Half provenance','family',${user})`,
    ).rejects.toMatchObject({ code: '23514' });

    const version = (fields: unknown, number: number, firmId = firm) =>
      sql`insert into practice_profile_versions(firm_id,profile_id,version,fields,created_by)
        values (${firmId},${deals.id},${number},${sql.json(fields as never)},${user}) returning id`;
    await expect(version({ key: 'not an array' }, 2)).rejects.toMatchObject({ code: '23514' });
    await expect(
      version(
        Array.from({ length: 51 }, (_, i) => ({ key: `f${i}` })),
        2,
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(version([{ label: 'x'.repeat(1_000_001) }], 2)).rejects.toMatchObject({
      code: '23514',
    });
    await expect(version([], 2, otherFirm)).rejects.toMatchObject({ code: '23503' });
    await expect(version([], 1)).rejects.toMatchObject({ code: '23505' });
    await expect(
      sql`insert into practice_profile_versions(firm_id,profile_id,version,fields,created_by,deleted_at)
        values (${firm},${deals.id},2,'[]'::jsonb,${user},now())`,
    ).rejects.toMatchObject({ code: '23514' });
    const [v1] = await sql`select id from practice_profile_versions where profile_id=${deals.id}`;
    await expect(
      sql`update practice_profile_versions set fields='[]'::jsonb where id=${v1!.id}`,
    ).rejects.toMatchObject({ code: '42501' });

    await expect(
      sql`update matters set field_values='{"entity_name":"A"}'::jsonb where id=${matter}`,
    ).rejects.toMatchObject({ code: '23514' });
    await sql`update matters set profile_version_id=${v1!.id},field_values='{"entity_name":"A"}'::jsonb where id=${matter}`;
    await expect(
      sql`update matters set field_values='[]'::jsonb where id=${matter}`,
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      sql`update matters set field_values=jsonb_build_object('notes',repeat('x',400001)) where id=${matter}`,
    ).rejects.toMatchObject({ code: '23514' });
    // Values at the shared core budget (90000 UTF-8 bytes of JSON) always store.
    const atBudget = Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [`notes_${i}`, '漢'.repeat(5000)]),
    );
    expect(Buffer.byteLength(JSON.stringify(atBudget))).toBeLessThanOrEqual(90_000);
    await sql`update matters set field_values=${sql.json(atBudget)} where id=${matter}`;
    await sql`update matters set title='Renamed advisory' where id=${matter}`;
    const [v2] = await version([], 2);
    await sql`update practice_profiles set current_version=2,revision=2 where id=${deals.id}`;
    await expect(
      sql`update practice_profiles set current_version=7 where id=${deals.id}`,
    ).rejects.toMatchObject({ code: '23503' });
    for (const change of [
      sql`update matters set profile_version_id=${v2!.id} where id=${matter}`,
      sql`update matters set profile_version_id=null,field_values='{}'::jsonb where id=${matter}`,
      sql`update practice_profiles set based_on_key='family',based_on_version=1 where id=${deals.id}`,
      sql`update practice_profiles set firm_id=${otherFirm} where id=${deals.id}`,
      sql`update practice_profiles set created_by=gen_random_uuid() where id=${deals.id}`,
      sql`update practice_profiles set current_version=1 where id=${deals.id}`,
      sql`update practice_profiles set revision=1 where id=${deals.id}`,
      // Even the owning role cannot discard published history.
      sql`delete from practice_profile_versions where id=${v2!.id}`,
      sql`delete from practice_profiles where id=${deals.id}`,
      sql`truncate practice_profile_versions cascade`,
      sql`truncate practice_profiles cascade`,
    ])
      await expect(change).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql`update practice_profiles set deleted_at=now() where id=${deals.id}`,
    ).rejects.toMatchObject({ code: '23514' });
    // A version from another firm cannot be pinned, even to a matter without one.
    const [foreignVersion] =
      await sql`select id from practice_profile_versions where profile_id=${foreignProfile.id}`;
    const bare = randomUUID();
    await sql`insert into matters(id,firm_id,title,created_by) values (${bare},${firm},'Bare',${user})`;
    await expect(
      sql`update matters set profile_version_id=${foreignVersion!.id} where id=${bare}`,
    ).rejects.toMatchObject({ code: '23503' });

    for (const table of ['practice_profiles', 'practice_profile_versions'])
      await expect(
        sql.begin(async (tx) => {
          await tx`set local role service_role`;
          await tx`delete from ${tx(table)}`;
        }),
      ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql.begin(async (tx) => {
        await tx`set local role service_role`;
        await tx`update practice_profile_versions set created_by=${user}`;
      }),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`insert into practice_profiles(firm_id,name,created_by) values (${firm},'Client write',${user})`;
      }),
    ).rejects.toMatchObject({ code: '42501' });

    await expect(apply(rollback)).rejects.toThrow('Rollback refused');
    await sql`rollback`;
    expect(await tables()).toBe(2);
    expect(await matterColumns()).toBe(2);
    // Command or audit history alone still refuses: it names records that would vanish.
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role=replica`;
      await tx`update matters set profile_version_id=null,field_values='{}'::jsonb`;
      await tx`delete from practice_profiles`;
      await tx`delete from practice_profile_versions`;
    });
    await sql`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
      values (gen_random_uuid(),${firm},${user},'practice_profile.create.v1',gen_random_uuid(),gen_random_uuid(),'h','{}'::jsonb)`;
    await expect(apply(rollback)).rejects.toThrow('Rollback refused');
    await sql`rollback`;
    expect(await tables()).toBe(2);
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role=replica`;
      await tx`delete from command_receipts`;
    });
    await sql`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
      values (${firm},${user},gen_random_uuid(),gen_random_uuid(),'matter.fields.update.v1','matter',${matter},'{}'::jsonb,'{}'::jsonb)`;
    await expect(apply(rollback)).rejects.toThrow('Rollback refused');
    await sql`rollback`;
    expect(await tables()).toBe(2);
  } finally {
    await sql.end({ timeout: 5 });
    await admin`drop database ${admin(name)} with (force)`;
    await admin.end();
  }
});
