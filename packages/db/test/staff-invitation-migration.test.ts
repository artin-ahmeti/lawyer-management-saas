import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import postgres from 'postgres';
import { expect, it } from 'vitest';

it('preserves an existing firm, protects invitation provenance and safely reverses an unused upgrade', async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Local Postgres required');
  const admin = postgres(url.href, { max: 1 }),
    name = `clepso_invitation_${randomUUID().replaceAll('-', '')}`;
  await admin`create database ${admin(name)} template template0`;
  url.pathname = `/${name}`;
  const sql = postgres(url.href, { max: 1 });
  const root = new URL('../../../supabase/', import.meta.url);
  const apply = async (path: string) =>
    sql.unsafe(await readFile(new URL(path, root), 'utf8')).simple();
  try {
    await sql
      .unsafe(
        `create schema auth; create table auth.users (id uuid primary key,email text,raw_user_meta_data jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid $$;`,
      )
      .simple();
    const files = (await readdir(new URL('migrations/', root)))
      // This module's rollback/reapply must not apply later modules twice.
      .filter((f) => f.endsWith('.sql') && f <= '20261007145835_staff_invitation_security.sql')
      .sort();
    for (const file of files.filter((f) => f < '20261007')) await apply(`migrations/${file}`);
    const firm = randomUUID(),
      user = randomUUID(),
      other = randomUUID(),
      invitation = randomUUID();
    await sql`insert into auth.users (id,email) values (${user},'owner@test.local'),(${other},'recipient@test.local')`;
    await sql`insert into firms (id,name,settings,revision) values (${firm},'Existing firm','{"preserve":true}'::jsonb,8)`;
    for (const file of files.filter((f) => f >= '20261007')) await apply(`migrations/${file}`);
    expect((await sql`select name,settings,revision from firms where id=${firm}`)[0]).toEqual({
      name: 'Existing firm',
      settings: { preserve: true },
      revision: 8,
    });
    await apply('rollbacks/20261007_staff_invitations.sql');
    for (const file of files.filter((f) => f >= '20261007')) await apply(`migrations/${file}`);
    expect(
      (
        await sql`select relrowsecurity,relforcerowsecurity from pg_class where oid='public.staff_invitations'::regclass`
      )[0],
    ).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
    await sql`insert into staff_invitations (id,firm_id,email,role,created_by,expires_at) values (${invitation},${firm},'recipient@test.local','attorney',${user},now()+interval '7 days')`;
    await expect(
      sql`update staff_invitations set role='admin' where id=${invitation}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql`update staff_invitations set expires_at=now()+interval '30 days' where id=${invitation}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      sql`update staff_invitations set status='accepted',revision=2,accepted_by=${other},accepted_at=now() where id=${invitation}`,
    ).rejects.toMatchObject({ code: '23503' });
    await sql`insert into firm_members (firm_id,user_id,role) values (${firm},${other},'attorney')`;
    await sql`update staff_invitations set status='accepted',revision=2,accepted_by=${other},accepted_at=now() where id=${invitation}`;
    await expect(
      sql`update staff_invitations set status='pending',revision=3,accepted_by=null,accepted_at=null where id=${invitation}`,
    ).rejects.toMatchObject({ code: '42501' });
    await expect(apply('rollbacks/20261007_staff_invitations.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
    expect(
      (await sql`select status from staff_invitations where id=${invitation}`)[0]?.status,
    ).toBe('accepted');
    await sql`delete from staff_invitations`; // test-owned disposable database only
    const key = randomUUID(),
      otherFirm = randomUUID();
    await sql`insert into firms (id,name) values (${otherFirm},'Second firm')`;
    await sql`insert into command_receipts (id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response) values (gen_random_uuid(),${firm},${other},'staff.invitation.accept.v1',${key},${randomUUID()},'hash','{}'::jsonb)`;
    await expect(
      sql`insert into command_receipts (id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response) values (gen_random_uuid(),${otherFirm},${other},'staff.invitation.accept.v1',${key},${randomUUID()},'hash','{}'::jsonb)`,
    ).rejects.toMatchObject({ code: '23505' });
    await expect(apply('rollbacks/20261007_staff_invitations.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
  } finally {
    await sql.end();
    await admin`drop database ${admin(name)}`;
    await admin.end();
  }
}, 40000);
