import { createHash, randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  firmRoleSchema,
  removedStaffListSchema,
  staffMembershipHistorySchema,
  staffMembershipResultSchema,
  type FirmRole,
  type RemoveStaffMembership,
  type RestoreStaffMembership,
  type StaffMembershipHistoryCursor,
} from '@lawfirm/core';
import type postgres from 'postgres';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import { hasFirmCapability, StaffAccessService } from '../../common/auth/staff-access.service';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';
import { canManageMatter, conflict, requireMatterHandoff, requireOtherOwner } from './staff-policy';

const removeCommand = 'staff.membership.remove.v1';
const restoreCommand = 'staff.membership.restore.v1';
// Matter managers see fixed text; the firm-level reason stays with firm administrators.
const grantReasons = {
  [removeCommand]: 'Staff membership removed.',
  [restoreCommand]: 'Staff membership restored without matter access.',
};
const unavailable = () =>
  new NotFoundException({
    code: 'STAFF_UNAVAILABLE',
    message: 'This staff membership is unavailable.',
  });
const changed = () =>
  conflict(
    'STAFF_MEMBERSHIP_CHANGED',
    'Staff access changed after this request. Refresh and review the history.',
  );
type Target = { id: string; role: FirmRole; revision: number; removed: boolean };
type Outcome = { value: ReturnType<typeof staffMembershipResultSchema.parse>; replayed: boolean };

@Injectable()
export class StaffMembershipService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}
  private async manager(tx: postgres.TransactionSql, actor: AuthClaims, write = false) {
    await tx`set local lock_timeout='2s'`;
    await tx`set local statement_timeout='5s'`;
    await confirmedAccount(tx, actor.sub, write ? 'update' : 'share');
    const firm = await this.access.current(tx, actor, write ? 'update' : 'share');
    if (!hasFirmCapability(firm.role, 'firm.staff.memberships.manage'))
      throw new ForbiddenException({
        code: 'CAPABILITY_DENIED',
        message: 'Your current role cannot manage staff memberships.',
      });
    return firm;
  }
  async removed(actor: AuthClaims, afterId?: string) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.manager(tx, actor);
      const rows =
        await tx`select fm.user_id as "userId", p.full_name as name, u.email, fm.role, fm.revision,
        (u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp())) as "isAvailable",
        to_char(fm.deleted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "removedAt"
        from firm_members fm join profiles p on p.id=fm.user_id join auth.users u on u.id=fm.user_id
        where fm.firm_id=${firm.id} and fm.deleted_at is not null
        ${afterId ? tx`and fm.user_id > ${afterId}::uuid` : tx``} order by fm.user_id limit 21`;
      const items = rows.slice(0, 20);
      return removedStaffListSchema.parse({
        firmId: firm.id,
        assignableRoles: firmRoleSchema.options.filter(
          (role) => firm.role === 'owner' || role !== 'owner',
        ),
        items,
        nextCursor: rows.length > 20 ? items.at(-1)!.userId : null,
      });
    });
  }
  async history(actor: AuthClaims, cursor: StaffMembershipHistoryCursor) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.manager(tx, actor);
      const rows =
        await tx`select id,command_id as "commandId",created_by as "actorId",after->>'userId' as "userId",
        case when action='staff.membership.remove.v1' then 'removed' else 'restored' end as change,
        before->>'role' as "previousRole",after->>'role' as role,(after->>'revision')::int as revision,after->>'reason' as reason,
        to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAt"
        from audit_logs where firm_id=${firm.id} and action in ('staff.membership.remove.v1','staff.membership.restore.v1') and record_type='firm_member'
        ${cursor.beforeId ? tx`and (created_at,id) < (${cursor.beforeCreatedAt!}::timestamptz,${cursor.beforeId}::uuid)` : tx``}
        order by created_at desc,id desc limit 21`;
      const items = rows.slice(0, 20),
        last = items.at(-1);
      return staffMembershipHistorySchema.parse({
        firmId: firm.id,
        items,
        nextCursor:
          rows.length > 20 ? { beforeId: last!.id, beforeCreatedAt: last!.createdAt } : null,
      });
    });
  }
  async remove(actor: AuthClaims, input: RemoveStaffMembership, key: string, requestId: string) {
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const outcome = await this.database.sql.begin(async (tx): Promise<Outcome> => {
      // The exclusive firm lock serializes membership decisions with every supported
      // domain command, including matter grant changes and invitation acceptance.
      const firm = await this.manager(tx, actor, true);
      // Receipts are scoped to firm and actor, so a reused key is judged before the target.
      const replay = await this.replay(tx, firm.id, actor, removeCommand, key, hash);
      // Removal does not require an available account: deprovisioning a banned or
      // deleted account is a primary reason to remove a membership.
      const [target] = await tx<Target[]>`select id,role,revision,deleted_at is not null as removed
        from firm_members where firm_id=${firm.id} and user_id=${input.userId} for update`;
      if (replay) {
        if (!target?.removed || target.revision !== replay.revision) throw changed();
        return { value: replay, replayed: true };
      }
      if (!target) throw unavailable();
      if (firm.role !== 'owner' && target.role === 'owner')
        throw new ForbiddenException({
          code: 'OWNER_REQUIRED',
          message: 'A current firm owner must review owner memberships.',
        });
      if (target.revision !== input.expectedRevision)
        throw conflict(
          'STAFF_MEMBERSHIP_CHANGED',
          'Staff access changed. Refresh before preparing another change.',
        );
      if (target.removed)
        throw conflict('STAFF_MEMBERSHIP_UNCHANGED', 'This membership is already removed.');
      if (target.role === 'owner')
        await requireOtherOwner(
          tx,
          firm.id,
          input.userId,
          'Assign another available firm owner before removing this owner.',
        );
      if (canManageMatter(target.role))
        await requireMatterHandoff(
          tx,
          firm.id,
          input.userId,
          'An authorized matter manager must complete a handoff before this removal.',
        );
      const commandId = randomUUID(),
        revision = target.revision + 1;
      await this.revokeGrants(
        tx,
        firm.id,
        input.userId,
        actor.sub,
        commandId,
        requestId,
        removeCommand,
      );
      await tx`update firm_members set deleted_at=clock_timestamp(),revision=${revision} where id=${target.id}`;
      const value = staffMembershipResultSchema.parse({
        firmId: firm.id,
        userId: input.userId,
        role: target.role,
        revision,
        status: 'removed',
        commandId,
      });
      await this.record(
        tx,
        actor,
        removeCommand,
        key,
        requestId,
        hash,
        value,
        target,
        input.reason,
      );
      return { value, replayed: false };
    });
    return this.completed(removeCommand, requestId, outcome);
  }
  async restore(actor: AuthClaims, input: RestoreStaffMembership, key: string, requestId: string) {
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const outcome = await this.database.sql.begin(async (tx): Promise<Outcome> => {
      const firm = await this.manager(tx, actor, true);
      const replay = await this.replay(tx, firm.id, actor, restoreCommand, key, hash);
      const [target] = await tx<
        Target[]
      >`select fm.id,fm.role,fm.revision,fm.deleted_at is not null as removed
        from firm_members fm join auth.users u on u.id=fm.user_id
        where fm.firm_id=${firm.id} and fm.user_id=${input.userId}
        and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp())
        for update of fm for share of u`;
      if (replay) {
        if (
          !target ||
          target.removed ||
          target.revision !== replay.revision ||
          target.role !== replay.role
        )
          throw changed();
        return { value: replay, replayed: true };
      }
      if (!target) throw unavailable();
      if (firm.role !== 'owner' && input.role === 'owner')
        throw new ForbiddenException({
          code: 'OWNER_REQUIRED',
          message: 'A current firm owner must review owner memberships.',
        });
      if (target.revision !== input.expectedRevision)
        throw conflict(
          'STAFF_MEMBERSHIP_CHANGED',
          'Staff access changed. Refresh before preparing another change.',
        );
      if (!target.removed)
        throw conflict('STAFF_MEMBERSHIP_UNCHANGED', 'This membership is already active.');
      const commandId = randomUUID(),
        revision = target.revision + 1;
      // A membership removed outside this command may still hold grants; restoration
      // must never silently reopen an ethical wall, so any remainder is revoked first.
      await this.revokeGrants(
        tx,
        firm.id,
        input.userId,
        actor.sub,
        commandId,
        requestId,
        restoreCommand,
      );
      await tx`update firm_members set deleted_at=null,role=${input.role},revision=${revision} where id=${target.id}`;
      const value = staffMembershipResultSchema.parse({
        firmId: firm.id,
        userId: input.userId,
        role: input.role,
        revision,
        status: 'active',
        commandId,
      });
      await this.record(
        tx,
        actor,
        restoreCommand,
        key,
        requestId,
        hash,
        value,
        target,
        input.reason,
      );
      return { value, replayed: false };
    });
    return this.completed(restoreCommand, requestId, outcome);
  }
  private async replay(
    tx: postgres.TransactionSql,
    firmId: string,
    actor: AuthClaims,
    command: string,
    key: string,
    hash: string,
  ) {
    const [receipt] = await tx`select input_hash,response from command_receipts
      where firm_id=${firmId} and created_by=${actor.sub} and command=${command} and idempotency_key=${key}`;
    if (!receipt) return null;
    if (receipt.input_hash !== hash)
      throw conflict(
        'IDEMPOTENCY_CONFLICT',
        'This action key was used for another membership change.',
      );
    return staffMembershipResultSchema.parse(receipt.response);
  }
  /** Revokes every active grant of the user, recording each change in its matter's history. */
  private async revokeGrants(
    tx: postgres.TransactionSql,
    firmId: string,
    userId: string,
    actorId: string,
    commandId: string,
    requestId: string,
    command: typeof removeCommand | typeof restoreCommand,
  ) {
    // Matter rows before grant rows, the order matter access commands use.
    await tx`select m.id from matters m where m.firm_id=${firmId} and exists(select 1 from matter_access a
      where a.firm_id=m.firm_id and a.matter_id=m.id and a.user_id=${userId} and a.deleted_at is null)
      order by m.id for update of m`;
    await tx`with g as (update matter_access set deleted_at=clock_timestamp(),revision=revision+1
        where firm_id=${firmId} and user_id=${userId} and deleted_at is null returning matter_id,role,revision),
      m as (update matters set access_revision=access_revision+1 from g
        where matters.firm_id=${firmId} and matters.id=g.matter_id returning matters.id,matters.access_revision)
      insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after,created_at)
      select ${firmId},${actorId},${commandId},${requestId},'matter.access.change.v1','matter',g.matter_id,
        jsonb_build_object('userId',${userId}::uuid,'role',g.role,'grantRevision',g.revision-1,'accessRevision',m.access_revision-1),
        jsonb_build_object('userId',${userId}::uuid,'role',null,'grantRevision',g.revision,'accessRevision',m.access_revision,'reason',${grantReasons[command]}::text),
        clock_timestamp()
      from g join m on m.id=g.matter_id`;
  }
  private async record(
    tx: postgres.TransactionSql,
    actor: AuthClaims,
    command: string,
    key: string,
    requestId: string,
    hash: string,
    value: Outcome['value'],
    target: Target,
    reason: string,
  ) {
    await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
      values (${value.commandId},${value.firmId},${actor.sub},${command},${key},${requestId},${hash},${tx.json(value)})`;
    // Stamped after the exclusive firm lock, so history cursors follow commit order.
    await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after,created_at)
      values (${value.firmId},${actor.sub},${value.commandId},${requestId},${command},'firm_member',${target.id},
      ${tx.json({ userId: value.userId, role: target.role, revision: target.revision, status: target.removed ? 'removed' : 'active' })},
      ${tx.json({ userId: value.userId, role: value.role, revision: value.revision, status: value.status, reason })},clock_timestamp())`;
  }
  private completed(command: string, requestId: string, outcome: Outcome) {
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: outcome.value.commandId,
      firmId: outcome.value.firmId,
      requestId,
      replayed: outcome.replayed,
    });
    return outcome.value;
  }
}
