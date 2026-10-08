import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { expect, it } from 'vitest';

it('installs on a clean database, preserves existing firms, and safely reverses an unused upgrade', async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  );
  if (!['127.0.0.1', 'localhost'].includes(url.hostname))
    throw new Error('Migration tests require local Postgres');
  const admin = postgres(url.href, { max: 1 });
  const databaseName = `clepso_migration_${randomUUID().replaceAll('-', '')}`;
  await admin`create database ${admin(databaseName)} template template0`;
  url.pathname = `/${databaseName}`;
  const sql = postgres(url.href, { max: 1 });
  const root = new URL('../../../supabase/', import.meta.url);
  const apply = async (path: string) =>
    sql.unsafe(await readFile(new URL(path, root), 'utf8')).simple();
  try {
    // Minimal Supabase auth dependencies; full GoTrue/PostgREST coverage runs in rls-isolation.test.ts.
    await sql
      .unsafe(
        `create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;`,
      )
      .simple();
    await apply('migrations/20260820213856_wise_kid_colt.sql');
    await apply('migrations/20260820214500_rls_and_auth.sql');
    const firm = randomUUID();
    await sql`insert into firms (id, name, settings) values (${firm}, 'Preserved LLP', '{"existing":true}'::jsonb)`;
    await apply('migrations/20261006002359_careful_zzzax.sql');
    await apply('migrations/20261006002400_execution_security.sql');
    const [upgraded] = await sql`select name, settings, revision from firms where id = ${firm}`;
    expect(upgraded).toEqual({ name: 'Preserved LLP', settings: { existing: true }, revision: 0 });
    const pending = randomUUID();
    await sql`insert into outbox_events (id, firm_id, created_by, command_id, request_id, event_type, payload)
      values (${pending}, ${firm}, ${randomUUID()}, ${randomUUID()}, ${randomUUID()}, 'firm.renamed.v1', '{}'::jsonb)`;
    await apply('migrations/20261006013633_dry_nebula.sql');
    await apply('migrations/20261006013634_job_execution_security.sql');
    await apply('migrations/20261006014446_cold_lizard.sql');
    await apply('migrations/20261006191117_silly_nicolaos.sql');
    await apply('migrations/20261006191118_attempt_history_security.sql');
    await apply('migrations/20261006202213_workable_pixie.sql');
    await apply('migrations/20261006202214_execution_recovery_security.sql');
    await apply('migrations/20261006205504_aromatic_kate_bishop.sql');
    const [pendingEvent] =
      await sql`select id, dispatched_at from outbox_events where id = ${pending}`;
    expect(pendingEvent).toEqual({ id: pending, dispatched_at: null });
    const [security] = await sql`select bool_and(relrowsecurity and relforcerowsecurity) as enforced
      from pg_class where relname in ('command_receipts', 'audit_logs', 'outbox_events', 'job_executions', 'job_execution_attempts', 'execution_recoveries')`;
    expect(security?.enforced).toBe(true);
    await apply('rollbacks/20261006_firm_provision.sql');
    await apply('rollbacks/20261006_execution_recovery.sql');
    await apply('rollbacks/20261006_attempt_history.sql');
    await apply('rollbacks/20261006_job_execution.sql');
    const [preservedPending] = await sql`select id from outbox_events where id = ${pending}`;
    expect(preservedPending?.id).toBe(pending);
    await apply('migrations/20261006013633_dry_nebula.sql');
    await apply('migrations/20261006013634_job_execution_security.sql');
    await apply('migrations/20261006014446_cold_lizard.sql');
    await sql`insert into job_executions (id, outbox_event_id, firm_id, created_by)
      select id, id, firm_id, created_by from outbox_events where id = ${pending}`;
    await sql`update job_executions set attempts = 3 where id = ${pending}`;
    await apply('migrations/20261006191117_silly_nicolaos.sql');
    await apply('migrations/20261006191118_attempt_history_security.sql');
    await apply('migrations/20261006202213_workable_pixie.sql');
    await apply('migrations/20261006202214_execution_recovery_security.sql');
    await apply('migrations/20261006205504_aromatic_kate_bishop.sql');
    const otherFirm = randomUUID();
    const provisionActor = randomUUID();
    const provisionKey = randomUUID();
    await sql`insert into firms (id, name) values (${otherFirm}, 'Other firm')`;
    await sql`insert into command_receipts (id, firm_id, created_by, command, idempotency_key, request_id, input_hash, response)
      values (gen_random_uuid(), ${firm}, ${provisionActor}, 'firm.provision.v1', ${provisionKey}, gen_random_uuid(), 'hash', '{}'::jsonb)`;
    await expect(sql`insert into command_receipts (id, firm_id, created_by, command, idempotency_key, request_id, input_hash, response)
      values (gen_random_uuid(), ${otherFirm}, ${provisionActor}, 'firm.provision.v1', ${provisionKey}, gen_random_uuid(), 'hash', '{}'::jsonb)`).rejects.toMatchObject(
      { code: '23505' },
    );
    await expect(apply('rollbacks/20261006_firm_provision.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
    expect(
      (
        await sql`select count(*)::int as n from command_receipts where command = 'firm.provision.v1'`
      )[0]?.n,
    ).toBe(1);
    await sql`delete from command_receipts where command = 'firm.provision.v1'`;
    await apply('rollbacks/20261006_firm_provision.sql');
    expect(
      (await sql`select attempts from job_executions where id = ${pending}`)[0]?.attempts,
    ).toBe(3);
    expect((await sql`select count(*)::int as count from job_execution_attempts`)[0]?.count).toBe(
      0,
    );
    await sql`insert into job_execution_attempts (job_id, firm_id, created_by, attempt_number,
      lease_token, started_at, lease_until, status, finished_at)
      select id, firm_id, created_by, 3, gen_random_uuid(), now(), now() + interval '30 seconds', 'succeeded', now()
      from job_executions where id = ${pending}`;
    await expect(sql`insert into job_execution_attempts (job_id, firm_id, created_by,
      attempt_number, lease_token, lease_until)
      select id, ${randomUUID()}, created_by, 4, gen_random_uuid(), now() + interval '30 seconds'
      from job_executions where id = ${pending}`).rejects.toMatchObject({ code: '23503' });
    const replacement = randomUUID();
    await sql`insert into outbox_events (id, firm_id, created_by, command_id, request_id, event_type, payload)
      select ${replacement}, firm_id, created_by, gen_random_uuid(), gen_random_uuid(), 'firm.profile-check-requested.v1', '{}'::jsonb
      from job_executions where id = ${pending}`;
    await expect(sql`insert into execution_recoveries (id, firm_id, created_by, source_job_id, source_created_by, replacement_event_id, request_id, reviewed_revision, reason)
      select gen_random_uuid(), firm_id, ${randomUUID()}, id, created_by, ${replacement}, gen_random_uuid(), 1, 'Reviewed'
      from job_executions where id = ${pending}`).rejects.toMatchObject({ code: '23503' });
    await sql`insert into execution_recoveries (id, firm_id, created_by, source_job_id, source_created_by, replacement_event_id, request_id, reviewed_revision, reason)
      select gen_random_uuid(), firm_id, created_by, id, created_by, ${replacement}, gen_random_uuid(), 1, 'Reviewed'
      from job_executions where id = ${pending}`;
    await expect(sql`update execution_recoveries set reason = 'Rewritten'`).rejects.toMatchObject({
      code: '42501',
    });
    await expect(apply('rollbacks/20261006_execution_recovery.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
    expect((await sql`select count(*)::int as n from execution_recoveries`)[0]?.n).toBe(1);
    await sql`delete from execution_recoveries`; // privileged cleanup in this disposable database only
    await sql`delete from outbox_events where id = ${replacement}`;
    await apply('rollbacks/20261006_execution_recovery.sql');
    await expect(apply('rollbacks/20261006_attempt_history.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
    expect((await sql`select count(*)::int as count from job_execution_attempts`)[0]?.count).toBe(
      1,
    );
    await sql`delete from job_execution_attempts`; // privileged cleanup in this disposable database only
    await apply('rollbacks/20261006_attempt_history.sql');
    await expect(apply('rollbacks/20261006_job_execution.sql')).rejects.toThrow('Rollback refused');
    await sql`rollback`;
    expect((await sql`select count(*)::int as count from job_executions`)[0]?.count).toBe(1);
    await sql`delete from job_executions where id = ${pending}`;
    await sql`delete from outbox_events where id = ${pending}`;
    await apply('rollbacks/20261006_job_execution.sql');
    await apply('rollbacks/20261006_execution_foundation.sql');
    const [restored] = await sql`select name, settings from firms where id = ${firm}`;
    expect(restored).toEqual({ name: 'Preserved LLP', settings: { existing: true } });
    await apply('migrations/20261006002359_careful_zzzax.sql');
    await apply('migrations/20261006002400_execution_security.sql');
    await sql`insert into audit_logs (firm_id, created_by, command_id, request_id, action,
      record_type, record_id, before, after) values (${firm}, ${randomUUID()}, ${randomUUID()},
      ${randomUUID()}, 'test', 'firm', ${firm}, '{}'::jsonb, '{}'::jsonb)`;
    await expect(apply('rollbacks/20261006_execution_foundation.sql')).rejects.toThrow(
      'Rollback refused',
    );
    await sql`rollback`;
    const [retained] = await sql`select count(*)::int as count from audit_logs`;
    expect(retained?.count).toBe(1);
  } finally {
    await sql.end();
    await admin`drop database ${admin(databaseName)}`;
    await admin.end();
  }
}, 40_000);
