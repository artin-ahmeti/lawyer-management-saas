import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { executionDatabase } from './database.js';
import { ExecutionService } from '../src/execution.js';

const database = executionDatabase(),
  sql = database.sql;
const firm = randomUUID(),
  owner = randomUUID(),
  recipient = randomUUID();
const invitationId = randomUUID();
const service = new ExecutionService(sql, { enqueue: async () => {} }, pino({ level: 'silent' }));
beforeAll(async () => {
  await database.start();
  for (const user of [owner, recipient])
    await sql`insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data) values (${user},${`${user}@worker.test`},now(),'{}'::jsonb)`;
  await sql`insert into firms (id,name) values (${firm},'Invitation worker')`;
  await sql`insert into firm_members (firm_id,user_id,role) values (${firm},${owner},'owner')`;
});
beforeEach(async () => {
  await sql`delete from job_execution_attempts`;
  await sql`delete from job_executions`;
  await sql`delete from outbox_events`;
  await sql`delete from staff_invitations`;
  await sql`delete from firm_members where user_id=${recipient}`;
  await sql`update firm_members set role='owner',deleted_at=null where user_id=${owner}`;
  await sql`update auth.users set banned_until=null,deleted_at=null where id=${owner}`;
  await sql`insert into staff_invitations (id,firm_id,email,role,created_by,expires_at) values (${invitationId},${firm},${`${recipient}@worker.test`},'readonly',${owner},now()+interval '7 days')`;
});
afterAll(async () => database.close());
async function event(revision = 1, actor = owner, payloadFirm = firm) {
  const id = randomUUID();
  await sql`insert into outbox_events (id,firm_id,created_by,command_id,request_id,event_type,payload) values (${id},${firm},${actor},${randomUUID()},${randomUUID()},'staff.invitation-check-requested.v1',${sql.json({ firmId: payloadFirm, invitationId, revision })})`;
  await service.dispatchBatch();
  return id;
}
const job = async (id: string) =>
  (await sql`select status,result,last_error_code,attempts from job_executions where id=${id}`)[0];
it('verifies source state once without granting membership or pretending to deliver email', async () => {
  const id = await event();
  await Promise.all([service.process(id), service.process(id)]);
  expect(await job(id)).toEqual({
    status: 'succeeded',
    attempts: 1,
    last_error_code: null,
    result: {
      kind: 'staff_invitation_verified',
      invitationId,
      revision: 1,
      status: 'pending',
      delivery: 'unavailable',
    },
  });
  expect(
    (await sql`select count(*)::int as n from firm_members where user_id=${recipient}`)[0]?.n,
  ).toBe(0);
  expect(
    (await sql`select count(*)::int as n from job_execution_attempts where job_id=${id}`)[0]?.n,
  ).toBe(1);
});
it('blocks changed invitation state, revoked issuer authority, invalid scope and banned accounts', async () => {
  const changed = await event();
  await sql`update staff_invitations set status='revoked',revision=2,revoked_by=${owner},revoked_at=now() where id=${invitationId}`;
  await service.process(changed);
  expect(await job(changed)).toMatchObject({
    status: 'blocked',
    last_error_code: 'SOURCE_CHANGED',
    result: null,
  });
  const revoked = await event(2);
  await sql`update firm_members set role='attorney' where user_id=${owner}`;
  await service.process(revoked);
  expect(await job(revoked)).toMatchObject({
    status: 'blocked',
    last_error_code: 'ACCESS_REVOKED',
  });
  await sql`update firm_members set role='owner' where user_id=${owner}`;
  const invalid = await event(2, owner, randomUUID());
  await service.process(invalid);
  expect(await job(invalid)).toMatchObject({ status: 'blocked', last_error_code: 'INVALID_EVENT' });
  const banned = await event(2);
  await sql`update auth.users set banned_until=now()+interval '1 hour' where id=${owner}`;
  await service.process(banned);
  expect(await job(banned)).toMatchObject({ status: 'blocked', last_error_code: 'ACCESS_REVOKED' });
});
it('verifies acceptance for its current readonly recipient and blocks a later membership revocation', async () => {
  await sql`insert into firm_members (firm_id,user_id,role) values (${firm},${recipient},'readonly')`;
  await sql`update staff_invitations set status='accepted',revision=2,accepted_by=${recipient},accepted_at=now() where id=${invitationId}`;
  const accepted = await event(2, recipient);
  await service.process(accepted);
  expect(await job(accepted)).toMatchObject({
    status: 'succeeded',
    result: { status: 'accepted', delivery: 'unavailable' },
  });
  const revoked = await event(2, recipient);
  await sql`update firm_members set deleted_at=now() where user_id=${recipient}`;
  await service.process(revoked);
  expect(await job(revoked)).toMatchObject({
    status: 'blocked',
    last_error_code: 'ACCESS_REVOKED',
  });
  const unrelated = await event(2, owner);
  await service.process(unrelated);
  expect(await job(unrelated)).toMatchObject({
    status: 'blocked',
    last_error_code: 'INVALID_EVENT',
  });
});
