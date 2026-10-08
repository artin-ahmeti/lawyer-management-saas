import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { expect, it } from 'vitest';

it('adds forums and matter jurisdiction references beside existing matters, guards history and refuses used rollback', async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Local DB required');
  const admin = postgres(url.href, { max: 1 }),
    name = `clepso_jurisdictions_${randomUUID().replaceAll('-', '')}`;
  await admin`create database ${admin(name)} template template0`;
  url.pathname = `/${name}`;
  const sql = postgres(url.href, { max: 1 }),
    root = new URL('../../../supabase/', import.meta.url);
  const apply = async (file: string) =>
    sql.unsafe(await readFile(new URL(file, root), 'utf8')).simple();
  const rollback = 'rollbacks/20261008_jurisdictions.sql';
  const tables = async () =>
    (
      await sql`select count(*)::int as n from pg_class where oid in
        (to_regclass('public.forums'),to_regclass('public.matter_jurisdictions'))
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
    const slice = [
      '20261008195221_petite_young_avengers.sql',
      '20261008195222_jurisdiction_security.sql',
    ];
    const files = (await readdir(new URL('migrations/', root)))
      .filter((f) => f.endsWith('.sql') && f < slice[0]!)
      .sort();
    expect(files.at(-1)).toBe('20261008190311_practice_profile_security.sql');
    for (const file of files) await apply(`migrations/${file}`);
    const user = randomUUID(),
      firm = randomUUID(),
      otherFirm = randomUUID(),
      matter = randomUUID();
    await sql`insert into auth.users(id,email,email_confirmed_at) values (${user},'migration@jurisdiction.test',now())`;
    await sql`insert into firms(id,name) values (${firm},'Existing firm'),(${otherFirm},'Other firm')`;
    await sql`insert into firm_members(firm_id,user_id,role) values (${firm},${user},'owner')`;
    await sql`insert into matters(id,firm_id,title,revision,created_by) values (${matter},${firm},'Existing advisory',3,${user})`;
    for (const file of slice) await apply(`migrations/${file}`);
    expect(await tables()).toBe(2);
    expect((await sql`select title,revision from matters where id=${matter}`)[0]).toEqual({
      title: 'Existing advisory',
      revision: 3,
    });

    await apply(rollback);
    expect(await tables()).toBe(0);
    for (const file of slice) await apply(`migrations/${file}`);
    expect(await tables()).toBe(2);

    const forum = (jurisdiction: string, forumName: string, kind = 'court', firmId = firm) =>
      sql`insert into forums(firm_id,name,kind,jurisdiction,created_by)
        values (${firmId},${forumName},${kind},${jurisdiction},${user}) returning id`;
    await expect(forum('XX', 'Unknown')).rejects.toMatchObject({ code: '23514' });
    await expect(forum('CA', 'Board', 'board')).rejects.toMatchObject({ code: '23514' });
    await expect(forum('CA', ' Padded ')).rejects.toMatchObject({ code: '23514' });
    const [court] = await forum('NY', 'Supreme Court');
    await expect(forum('NY', 'supreme court')).rejects.toMatchObject({ code: '23505' });
    const [federal] = await forum('US', 'Supreme Court');
    const [foreign] = await forum('NY', 'Supreme Court', 'court', otherFirm);

    const reference = (values: {
      purpose: string;
      jurisdiction: string;
      forumId?: string | null;
      docket?: string | null;
      label?: string | null;
      deletedAt?: Date | null;
    }) =>
      sql`insert into matter_jurisdictions(firm_id,matter_id,purpose,jurisdiction,forum_id,docket_number,label,created_by,deleted_at)
        values (${firm},${matter},${values.purpose},${values.jurisdiction},${values.forumId ?? null},
          ${values.docket ?? null},${values.label ?? null},${user},${values.deletedAt ?? null}) returning id`;
    await expect(
      reference({ purpose: 'governing_law', jurisdiction: 'NY', forumId: court!.id }),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      reference({ purpose: 'governing_law', jurisdiction: 'NY', docket: '1' }),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(reference({ purpose: 'other', jurisdiction: 'NY' })).rejects.toMatchObject({
      code: '23514',
    });
    await expect(
      reference({ purpose: 'venue', jurisdiction: 'NY', label: 'Seat' }),
    ).rejects.toMatchObject({ code: '23514' });
    // A forum belongs to one jurisdiction and one firm.
    await expect(
      reference({ purpose: 'venue', jurisdiction: 'CA', forumId: court!.id }),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      reference({ purpose: 'venue', jurisdiction: 'NY', forumId: foreign!.id }),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      reference({ purpose: 'venue', jurisdiction: 'NY', deletedAt: new Date() }),
    ).rejects.toMatchObject({ code: '42501' });
    const [law] = await reference({ purpose: 'governing_law', jurisdiction: 'DE' });
    await expect(reference({ purpose: 'governing_law', jurisdiction: 'DE' })).rejects.toMatchObject(
      { code: '23505' },
    );
    const [venue] = await reference({
      purpose: 'venue',
      jurisdiction: 'US',
      forumId: federal!.id,
      docket: '1:26-cv-1',
    });
    await reference({ purpose: 'venue', jurisdiction: 'US', forumId: federal!.id, docket: '2' });
    for (const change of [
      sql`update matter_jurisdictions set purpose='agency' where id=${venue!.id}`,
      sql`update matter_jurisdictions set docket_number='3' where id=${venue!.id}`,
      sql`update matter_jurisdictions set jurisdiction='NY',forum_id=${court!.id} where id=${venue!.id}`,
      sql`update matter_jurisdictions set created_by=gen_random_uuid() where id=${venue!.id}`,
      sql`update matter_jurisdictions set deleted_at=created_at - interval '1 day' where id=${venue!.id}`,
      sql`update forums set kind='agency' where id=${court!.id}`,
      sql`update forums set jurisdiction='CA' where id=${court!.id}`,
      sql`update forums set firm_id=${otherFirm} where id=${court!.id}`,
      sql`update forums set created_by=gen_random_uuid() where id=${court!.id}`,
      sql`update forums set deleted_at=now() where id=${court!.id}`,
      sql`update forums set revision=0 where id=${court!.id}`,
    ])
      await expect(change).rejects.toMatchObject({
        code: expect.stringMatching(/^(42501|23514)$/),
      });
    await sql`update matter_jurisdictions set deleted_at=clock_timestamp() where id=${law!.id}`;
    await expect(
      sql`update matter_jurisdictions set deleted_at=null where id=${law!.id}`,
    ).rejects.toMatchObject({ code: '42501' });
    // Times come from the database clock, and forum changes always advance the revision.
    await expect(
      sql`insert into matter_jurisdictions(firm_id,matter_id,purpose,jurisdiction,created_by,created_at)
        values (${firm},${matter},'agency','PR',${user},now() + interval '1 year')`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql`update matter_jurisdictions set deleted_at=now() + interval '1 year' where id=${venue!.id}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql`update forums set name='Renamed court' where id=${federal!.id}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql`update forums set name='Renamed court',revision=revision+2 where id=${federal!.id}`,
    ).rejects.toMatchObject({ code: '42501' });
    // New references refuse an archived forum and a deleted matter.
    const [archivedForum] = await forum('NY', 'Archived board', 'agency');
    await sql`update forums set archived_at=now(),revision=revision+1 where id=${archivedForum!.id}`;
    await expect(
      reference({ purpose: 'agency', jurisdiction: 'NY', forumId: archivedForum!.id }),
    ).rejects.toMatchObject({ code: '42501' });
    const deletedMatter = randomUUID();
    await sql`insert into matters(id,firm_id,title,created_by,deleted_at) values (${deletedMatter},${firm},'Deleted',${user},now())`;
    await expect(
      sql`insert into matter_jurisdictions(firm_id,matter_id,purpose,jurisdiction,created_by)
        values (${firm},${deletedMatter},'governing_law','NY',${user})`,
    ).rejects.toMatchObject({ code: '42501' });
    // An ended reference frees its slot; archiving a forum frees its name.
    await reference({ purpose: 'governing_law', jurisdiction: 'DE' });
    await sql`update forums set archived_at=now(),revision=revision+1,name='Supreme Court' where id=${court!.id}`;
    await forum('NY', 'Supreme Court');
    // History cannot be deleted or truncated, whichever role connects.
    for (const table of ['forums', 'matter_jurisdictions']) {
      await expect(sql`delete from ${sql(table)}`).rejects.toMatchObject({ code: '42501' });
      await expect(sql`truncate ${sql(table)} cascade`).rejects.toMatchObject({ code: '42501' });
      await expect(
        sql.begin(async (tx) => {
          await tx`set local role service_role`;
          await tx`delete from ${tx(table)}`;
        }),
      ).rejects.toMatchObject({ code: '42501' });
    }
    await expect(
      sql.begin(async (tx) => {
        await tx`set local role authenticated`;
        await tx`insert into forums(firm_id,name,kind,jurisdiction,created_by) values (${firm},'Client write','agency','CA',${user})`;
      }),
    ).rejects.toMatchObject({ code: '42501' });

    await expect(apply(rollback)).rejects.toThrow('Rollback refused');
    await sql`rollback`;
    expect(await tables()).toBe(2);
    expect((await sql`select count(*)::int as n from matter_jurisdictions`)[0]?.n).toBe(4);
    // Command history alone still refuses: a receipt names a reference that would vanish.
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role=replica`;
      await tx`delete from matter_jurisdictions`;
      await tx`delete from forums`;
    });
    await sql`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
      values (gen_random_uuid(),${firm},${user},'matter.jurisdiction.add.v1',gen_random_uuid(),gen_random_uuid(),'h','{}'::jsonb)`;
    await expect(apply(rollback)).rejects.toThrow('Rollback refused');
    await sql`rollback`;
    expect(await tables()).toBe(2);
    // An audit alone also refuses.
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role=replica`;
      await tx`delete from command_receipts`;
    });
    await sql`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
      values (${firm},${user},gen_random_uuid(),gen_random_uuid(),'forum.create.v1','forum',gen_random_uuid(),'{}'::jsonb,'{}'::jsonb)`;
    await expect(apply(rollback)).rejects.toThrow('Rollback refused');
    await sql`rollback`;
    expect(await tables()).toBe(2);
  } finally {
    await sql.end({ timeout: 5 });
    await admin`drop database ${admin(name)} with (force)`;
    await admin.end();
  }
});
