import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  staffInvitationCommandResultSchema,
  staffInvitationListSchema,
  receivedInvitationListSchema,
  type CreateStaffInvitation,
  type InvitationCursor,
  type InvitationRevision,
  type StaffInvitationCommandResult,
  type StaffInvitationList,
  type ReceivedInvitationList,
} from '@lawfirm/core';
import type postgres from 'postgres';
import { DatabaseService } from '../../common/database/database.module';
import { StaffAccessService, hasFirmCapability } from '../../common/auth/staff-access.service';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { log } from '../../common/http';

type InvitationRow = {
  id: string;
  firm_id: string;
  email: string;
  role: 'admin' | 'attorney' | 'paralegal' | 'billing' | 'readonly';
  status: 'pending' | 'accepted' | 'revoked';
  revision: number;
  created_by: string;
  created_at: Date;
  expires_at: Date;
  accepted_by: string | null;
  expired: boolean;
  firm_name?: string;
};
type Tx = postgres.TransactionSql;
const missing = () =>
  new NotFoundException({
    code: 'INVITATION_UNAVAILABLE',
    message: 'This invitation is unavailable.',
  });
const conflict = (message: string) =>
  new ConflictException({ code: 'INVITATION_CONFLICT', message });
const inputHash = (input: unknown) =>
  createHash('sha256').update(JSON.stringify(input)).digest('hex');
const cursorFor = (rows: InvitationRow[]) => {
  const last = rows.at(19);
  return rows.length > 20 && last
    ? { beforeId: last.id, beforeCreatedAt: last.created_at.toISOString() }
    : null;
};
const view = (row: InvitationRow) => ({
  id: row.id,
  firmId: row.firm_id,
  role: row.role,
  revision: row.revision,
  status: row.status === 'pending' && row.expired ? 'expired' : row.status,
  createdAt: row.created_at.toISOString(),
  expiresAt: row.expires_at.toISOString(),
  delivery: 'unavailable' as const,
});

@Injectable()
export class StaffInvitationService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}
  private async bounded(tx: Tx) {
    await tx`set local lock_timeout = '2s'`;
    await tx`set local statement_timeout = '5s'`;
  }
  private async manager(tx: Tx, actor: AuthClaims, lock: 'share' | 'update') {
    const firm = await this.access.current(tx, actor, lock);
    if (!hasFirmCapability(firm.role, 'firm.staff.invitations.manage'))
      throw new ForbiddenException({
        code: 'CAPABILITY_DENIED',
        message: 'Your current role cannot manage staff invitations.',
      });
    return firm;
  }
  private async replay(
    tx: Tx,
    actor: AuthClaims,
    command: string,
    key: string,
    hash: string,
    firmId?: string,
  ) {
    const [receipt] = await tx`select firm_id,input_hash,response from public.command_receipts
   where created_by=${actor.sub} and command=${command} and idempotency_key=${key} ${firmId ? tx`and firm_id=${firmId}` : tx``}`;
    if (!receipt) return null;
    if (receipt.input_hash !== hash)
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'This action key was used for another invitation intent.',
      });
    return staffInvitationCommandResultSchema.parse(receipt.response);
  }
  private async record(
    tx: Tx,
    actor: AuthClaims,
    command: string,
    key: string,
    requestId: string,
    hash: string,
    row: InvitationRow,
    before: postgres.JSONValue,
  ): Promise<StaffInvitationCommandResult> {
    const commandId = randomUUID();
    const response = staffInvitationCommandResultSchema.parse({
      invitationId: row.id,
      firmId: row.firm_id,
      commandId,
      revision: row.revision,
      status: row.status,
      delivery: 'unavailable',
      requiresSessionRefresh: row.status === 'accepted',
    });
    await tx`insert into public.command_receipts (id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
   values (${commandId},${row.firm_id},${actor.sub},${command},${key},${requestId},${hash},${tx.json(response)})`;
    await tx`insert into public.audit_logs (firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
   values (${row.firm_id},${actor.sub},${commandId},${requestId},${command},'staff_invitation',${row.id},${tx.json(before)},${tx.json({ role: row.role, status: row.status, revision: row.revision, acceptedBy: row.accepted_by })})`;
    await tx`insert into public.outbox_events (firm_id,created_by,command_id,request_id,event_type,payload)
   values (${row.firm_id},${actor.sub},${commandId},${requestId},'staff.invitation-check-requested.v1',${tx.json({ firmId: row.firm_id, invitationId: row.id, revision: row.revision })})`;
    return response;
  }
  private completed(value: StaffInvitationCommandResult, requestId: string, command: string) {
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: value.commandId,
      firmId: value.firmId,
      recordId: value.invitationId,
      requestId,
    });
    return value;
  }
  async create(actor: AuthClaims, input: CreateStaffInvitation, key: string, requestId: string) {
    const command = 'staff.invitation.prepare.v1',
      hash = inputHash(input);
    const result = await this.database.sql.begin(async (tx) => {
      await this.bounded(tx);
      await confirmedAccount(tx, actor.sub, 'update');
      const firm = await this.manager(tx, actor, 'update');
      const replay = await this.replay(tx, actor, command, key, hash, firm.id);
      if (replay) return replay;
      const [member] =
        await tx`select fm.id from public.firm_members fm join auth.users u on u.id=fm.user_id
    where fm.firm_id=${firm.id} and lower(btrim(u.email))=${input.email} limit 1`;
      if (member)
        throw conflict(
          'An existing or revoked membership requires a membership review, not an invitation.',
        );
      const [pending] =
        await tx`select id from public.staff_invitations where firm_id=${firm.id} and email=${input.email} and status='pending' and deleted_at is null`;
      if (pending)
        throw conflict(
          'A pending invitation already exists. Review or revoke it before preparing another.',
        );
      const [row] = await tx<
        InvitationRow[]
      >`insert into public.staff_invitations (firm_id,email,role,created_by,expires_at)
    values (${firm.id},${input.email},${input.role},${actor.sub},clock_timestamp()+interval '7 days') returning *, false as expired`;
      if (!row) throw new Error('Invitation insert did not return a record');
      return this.record(tx, actor, command, key, requestId, hash, row, {});
    });
    return this.completed(result, requestId, command);
  }
  async list(actor: AuthClaims, cursor: InvitationCursor): Promise<StaffInvitationList> {
    return this.database.sql.begin(async (tx) => {
      await this.bounded(tx);
      await confirmedAccount(tx, actor.sub, 'share');
      const firm = await this.manager(tx, actor, 'share');
      const rows = await tx<
        InvitationRow[]
      >`select *,expires_at <= clock_timestamp() as expired from public.staff_invitations
    where firm_id=${firm.id} and deleted_at is null ${cursor.beforeId ? tx`and (created_at,id) < (${cursor.beforeCreatedAt!}::timestamptz,${cursor.beforeId}::uuid)` : tx``}
    order by created_at desc,id desc limit 21`;
      return staffInvitationListSchema.parse({
        firmId: firm.id,
        items: rows.slice(0, 20).map((row) => ({ ...view(row), email: row.email })),
        nextCursor: cursorFor(rows),
      });
    });
  }
  async revoke(
    actor: AuthClaims,
    id: string,
    input: InvitationRevision,
    key: string,
    requestId: string,
  ) {
    const command = 'staff.invitation.revoke.v1',
      hash = inputHash({ invitationId: id, ...input });
    const value = await this.database.sql.begin(async (tx) => {
      await this.bounded(tx);
      await confirmedAccount(tx, actor.sub, 'update');
      const firm = await this.manager(tx, actor, 'update');
      const [row] = await tx<
        InvitationRow[]
      >`select *,expires_at <= clock_timestamp() as expired from public.staff_invitations where id=${id} and firm_id=${firm.id} and deleted_at is null for update`;
      if (!row) throw missing();
      const replay = await this.replay(tx, actor, command, key, hash, firm.id);
      if (replay) return replay;
      if (row.status !== 'pending' || row.revision !== input.expectedRevision)
        throw conflict('The invitation changed. Refresh and review it before revoking.');
      const [updated] = await tx<
        InvitationRow[]
      >`update public.staff_invitations set status='revoked',revision=revision+1,revoked_by=${actor.sub},revoked_at=clock_timestamp() where id=${id} returning *, false as expired`;
      if (!updated) throw new Error('Invitation update did not return a record');
      return this.record(tx, actor, command, key, requestId, hash, updated, {
        status: row.status,
        revision: row.revision,
      });
    });
    return this.completed(value, requestId, command);
  }
  async received(actor: AuthClaims, cursor: InvitationCursor): Promise<ReceivedInvitationList> {
    return this.database.sql.begin(async (tx) => {
      await this.bounded(tx);
      const account = await confirmedAccount(tx, actor.sub, 'share');
      // Grant-free discovery reveals only invitations addressed to the live confirmed account.
      const rows = await tx<
        InvitationRow[]
      >`select i.*, f.name as firm_name, false as expired from public.staff_invitations i
    join public.firms f on f.id=i.firm_id join public.firm_members issuer on issuer.firm_id=i.firm_id and issuer.user_id=i.created_by
    join auth.users u on u.id=issuer.user_id
    where i.email=${account.email} and i.status='pending' and i.deleted_at is null and i.expires_at>clock_timestamp()
     and f.deleted_at is null and issuer.deleted_at is null and issuer.role in ('owner','admin') and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=clock_timestamp())
     ${cursor.beforeId ? tx`and (i.created_at,i.id)<(${cursor.beforeCreatedAt!}::timestamptz,${cursor.beforeId}::uuid)` : tx``}
    order by i.created_at desc,i.id desc limit 21`;
      return receivedInvitationListSchema.parse({
        userId: actor.sub,
        items: rows.slice(0, 20).map((row) => ({ ...view(row), firmName: row.firm_name })),
        nextCursor: cursorFor(rows),
      });
    });
  }
  async accept(
    actor: AuthClaims,
    id: string,
    input: InvitationRevision,
    key: string,
    requestId: string,
  ) {
    const command = 'staff.invitation.accept.v1',
      hash = inputHash({ invitationId: id, ...input });
    const value = await this.database.sql.begin(async (tx) => {
      await this.bounded(tx);
      const account = await confirmedAccount(tx, actor.sub, 'update');
      const replay = await this.replay(tx, actor, command, key, hash);
      if (replay) {
        await tx`select id from firms where id=${replay.firmId} and deleted_at is null for share`;
        const [grant] =
          await tx`select fm.id from public.firm_members fm join public.firms f on f.id=fm.firm_id
     where fm.firm_id=${replay.firmId} and fm.user_id=${actor.sub} and fm.deleted_at is null and f.deleted_at is null for share of fm`;
        if (!grant)
          throw new ForbiddenException({
            code: 'FIRM_ACCESS_DENIED',
            message: 'Your membership is no longer available.',
          });
        return replay;
      }
      // Lock firm before issuer membership, matching role-change commands' parent order.
      const [scope] =
        await tx`select firm_id from staff_invitations where id=${id} and email=${account.email} and deleted_at is null`;
      if (!scope) throw missing();
      await tx`select id from firms where id=${scope.firm_id} and deleted_at is null for share`;
      // Lock authorization before the invitation, matching manager commands' lock order.
      const [issuer] =
        await tx`select issuer.id from public.firm_members issuer join public.firms f on f.id=issuer.firm_id
    join public.staff_invitations i on i.firm_id=f.id and i.created_by=issuer.user_id join auth.users u on u.id=issuer.user_id
    where i.id=${id} and i.email=${account.email} and f.deleted_at is null and issuer.deleted_at is null and issuer.role in ('owner','admin')
      and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=clock_timestamp()) for share of issuer,u`;
      if (!issuer) throw missing();
      const [row] = await tx<
        InvitationRow[]
      >`select *,expires_at<=clock_timestamp() as expired from public.staff_invitations
    where id=${id} and email=${account.email} and deleted_at is null for update`;
      if (!row || row.status !== 'pending') throw missing();
      // Evaluate expiry after acquiring the row lock, including time spent waiting for it.
      const [fresh] =
        await tx`select expires_at>clock_timestamp() as valid from public.staff_invitations where id=${id}`;
      if (!fresh?.valid) throw missing();
      if (row.revision !== input.expectedRevision)
        throw conflict('This invitation changed. Refresh and review it before accepting.');
      const [existing] =
        await tx`select id from public.firm_members where firm_id=${row.firm_id} and user_id=${actor.sub}`;
      if (existing)
        throw conflict('An existing or revoked membership needs an administrator review.');
      await tx`insert into public.firm_members (firm_id,user_id,role,created_by) values (${row.firm_id},${actor.sub},${row.role},${actor.sub})`;
      const [updated] = await tx<
        InvitationRow[]
      >`update public.staff_invitations set status='accepted',revision=revision+1,accepted_by=${actor.sub},accepted_at=clock_timestamp() where id=${id} and expires_at>clock_timestamp() returning *, false as expired`;
      if (!updated) throw missing();
      return this.record(tx, actor, command, key, requestId, hash, updated, {
        status: row.status,
        revision: row.revision,
      });
    });
    return this.completed(value, requestId, command);
  }
}
