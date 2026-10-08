import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  changeStaffRoleResultSchema,
  firmRoleSchema,
  firmStaffListSchema,
  staffRoleHistorySchema,
  type ChangeStaffRole,
  type FirmRole,
  type StaffRoleHistoryCursor,
} from '@lawfirm/core';
import type postgres from 'postgres';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import { hasFirmCapability, StaffAccessService } from '../../common/auth/staff-access.service';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';

const command = 'staff.role.change.v1';
const canManageMatter = (role: FirmRole) => ['owner', 'admin', 'attorney'].includes(role);
const conflict = (code: string, message: string) => new ConflictException({ code, message });

@Injectable()
export class StaffRoleService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}
  private async manager(tx: postgres.TransactionSql, actor: AuthClaims, write = false) {
    await tx`set local lock_timeout='2s'`;
    await tx`set local statement_timeout='5s'`;
    await confirmedAccount(tx, actor.sub, write ? 'update' : 'share');
    const firm = await this.access.current(tx, actor, write ? 'update' : 'share');
    if (!hasFirmCapability(firm.role, 'firm.staff.roles.manage'))
      throw new ForbiddenException({
        code: 'CAPABILITY_DENIED',
        message: 'Your current role cannot manage staff roles.',
      });
    return firm;
  }
  async list(actor: AuthClaims, afterId?: string) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.manager(tx, actor);
      const rows =
        await tx`select fm.user_id as "userId", p.full_name as name, u.email, fm.role, fm.revision,
        (u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp())) as "isAvailable"
        from firm_members fm join profiles p on p.id=fm.user_id join auth.users u on u.id=fm.user_id
        where fm.firm_id=${firm.id} and fm.deleted_at is null
        ${afterId ? tx`and fm.user_id > ${afterId}::uuid` : tx``} order by fm.user_id limit 21 for share of fm,u`;
      const items = rows.slice(0, 20);
      return firmStaffListSchema.parse({
        firmId: firm.id,
        assignableRoles: firmRoleSchema.options.filter(
          (role) => firm.role === 'owner' || role !== 'owner',
        ),
        items,
        nextCursor: rows.length > 20 ? items.at(-1)!.userId : null,
      });
    });
  }
  async history(actor: AuthClaims, cursor: StaffRoleHistoryCursor) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.manager(tx, actor);
      const rows =
        await tx`select id,command_id as "commandId",created_by as "actorId",after->>'userId' as "userId",
        before->>'role' as "previousRole",after->>'role' as role,(after->>'revision')::int as revision,after->>'reason' as reason,
        to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAt"
        from audit_logs where firm_id=${firm.id} and action='staff.role.change.v1' and record_type='firm_member'
        ${cursor.beforeId ? tx`and (created_at,id) < (${cursor.beforeCreatedAt!}::timestamptz,${cursor.beforeId}::uuid)` : tx``}
        order by created_at desc,id desc limit 21`;
      const items = rows.slice(0, 20),
        last = items.at(-1);
      return staffRoleHistorySchema.parse({
        firmId: firm.id,
        items,
        nextCursor:
          rows.length > 20 ? { beforeId: last!.id, beforeCreatedAt: last!.createdAt } : null,
      });
    });
  }
  async change(actor: AuthClaims, input: ChangeStaffRole, key: string, requestId: string) {
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const outcome = await this.database.sql.begin(async (tx) => {
      // A firm lock serializes role decisions with all supported domain commands,
      // including concurrent matter grant/revoke and invitation acceptance.
      const firm = await this.manager(tx, actor, true);
      const [target] =
        await tx`select fm.id,fm.role,fm.revision from firm_members fm join auth.users u on u.id=fm.user_id
        where fm.firm_id=${firm.id} and fm.user_id=${input.userId} and fm.deleted_at is null
        and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp())
        for update of fm for share of u`;
      if (!target)
        throw new NotFoundException({
          code: 'STAFF_UNAVAILABLE',
          message: 'This staff membership is unavailable.',
        });
      if (firm.role !== 'owner' && (target.role === 'owner' || input.role === 'owner'))
        throw new ForbiddenException({
          code: 'OWNER_REQUIRED',
          message: 'A current firm owner must review owner role changes.',
        });
      const [receipt] = await tx`select input_hash,response from command_receipts
        where firm_id=${firm.id} and created_by=${actor.sub} and command=${command} and idempotency_key=${key}`;
      if (receipt) {
        if (receipt.input_hash !== hash)
          throw conflict(
            'IDEMPOTENCY_CONFLICT',
            'This action key was used for another role change.',
          );
        const value = changeStaffRoleResultSchema.parse(receipt.response);
        if (target.revision !== value.revision || target.role !== value.role)
          throw conflict(
            'STAFF_ROLE_CHANGED',
            'Staff access changed after this request. Refresh and review the history.',
          );
        return { value, replayed: true };
      }
      if (target.revision !== input.expectedRevision)
        throw conflict(
          'STAFF_ROLE_CHANGED',
          'Staff access changed. Refresh before preparing another change.',
        );
      if (target.role === input.role)
        throw conflict('STAFF_ROLE_UNCHANGED', 'This membership already has the requested role.');
      if (target.role === 'owner' && input.role !== 'owner') {
        const [other] =
          await tx`select fm.id from firm_members fm join auth.users u on u.id=fm.user_id
          where fm.firm_id=${firm.id} and fm.user_id<>${input.userId} and fm.role='owner' and fm.deleted_at is null
          and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp())
          order by fm.user_id limit 1 for share of fm,u`;
        if (!other)
          throw conflict(
            'LAST_FIRM_OWNER',
            'Assign another available firm owner before changing this owner role.',
          );
      }
      if (canManageMatter(target.role as FirmRole) && !canManageMatter(input.role)) {
        const [stranded] =
          await tx`select 1 from matter_access a join matters m on m.firm_id=a.firm_id and m.id=a.matter_id
          where a.firm_id=${firm.id} and a.user_id=${input.userId} and a.role='manager' and a.deleted_at is null and m.deleted_at is null
          and not exists(select 1 from matter_access b join firm_members fm on fm.firm_id=b.firm_id and fm.user_id=b.user_id
            join auth.users u on u.id=b.user_id where b.firm_id=a.firm_id and b.matter_id=a.matter_id and b.user_id<>a.user_id
            and b.role='manager' and b.deleted_at is null and fm.deleted_at is null and fm.role in ('owner','admin','attorney')
            and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp()) limit 1 for share of fm,u) limit 1`;
        // Firm administration confers no right to names, IDs or counts of restricted matters.
        if (stranded)
          throw conflict(
            'MATTER_HANDOFF_REQUIRED',
            'An authorized matter manager must complete a handoff before this role change.',
          );
      }
      const commandId = randomUUID(),
        revision = Number(target.revision) + 1;
      const value = changeStaffRoleResultSchema.parse({
        firmId: firm.id,
        userId: input.userId,
        role: input.role,
        revision,
        commandId,
      });
      await tx`update firm_members set role=${input.role},revision=${revision},updated_at=clock_timestamp() where id=${target.id}`;
      await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
        values (${commandId},${firm.id},${actor.sub},${command},${key},${requestId},${hash},${tx.json(value)})`;
      await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
        values (${firm.id},${actor.sub},${commandId},${requestId},${command},'firm_member',${target.id},
        ${tx.json({ userId: input.userId, role: target.role, revision: target.revision })},${tx.json({ userId: input.userId, role: input.role, revision, reason: input.reason })})`;
      return { value, replayed: false };
    });
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
