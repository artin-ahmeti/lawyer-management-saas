import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  changeMatterAccessResultSchema,
  matterAccessCandidatesSchema,
  matterAccessHistorySchema,
  matterAccessListSchema,
  type ChangeMatterAccess,
  type FirmRole,
  type MatterAccessHistoryQuery,
  type MatterAccessCandidates,
} from '@lawfirm/core';
import type postgres from 'postgres';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import { StaffAccessService } from '../../common/auth/staff-access.service';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';

const command = 'matter.access.change.v1';
const canManage = (role: FirmRole) => ['owner', 'admin', 'attorney'].includes(role);
const unavailable = () =>
  new NotFoundException({ code: 'MATTER_UNAVAILABLE', message: 'This matter is unavailable.' });
const conflict = (code: string, message: string) => new ConflictException({ code, message });

@Injectable()
export class MatterAccessService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}

  private async manager(
    tx: postgres.TransactionSql,
    actor: AuthClaims,
    matterId: string,
    write = false,
  ) {
    await tx`set local lock_timeout='2s'`;
    await tx`set local statement_timeout='5s'`;
    await confirmedAccount(tx, actor.sub, write ? 'update' : 'share');
    const firm = await this.access.current(tx, actor, 'share');
    // Serialize every policy change on the matter before taking grant locks.
    const [matter] =
      await tx`select access_revision from matters where firm_id=${firm.id} and id=${matterId} and deleted_at is null
      ${write ? tx`for update` : tx`for share`}`;
    if (!matter) throw unavailable();
    const [grant] =
      await tx`select role from matter_access where firm_id=${firm.id} and matter_id=${matterId}
      and user_id=${actor.sub} and deleted_at is null for share`;
    if (!grant) throw unavailable();
    if (grant.role !== 'manager' || !canManage(firm.role))
      throw new ForbiddenException({
        code: 'MATTER_ACCESS_MANAGEMENT_DENIED',
        message: 'Your current role and matter grant do not allow access management.',
      });
    return { firmId: firm.id, revision: Number(matter.access_revision) };
  }
  async list(actor: AuthClaims, matterId: string, afterId?: string) {
    return this.database.sql.begin(async (tx) => {
      const scope = await this.manager(tx, actor, matterId);
      const rows =
        await tx`select a.user_id as "userId", p.full_name as name, u.email, fm.role as "staffRole", a.role, a.revision,
        (fm.deleted_at is null and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp())) as "isActive"
        from matter_access a join firm_members fm on fm.firm_id=a.firm_id and fm.user_id=a.user_id
        join profiles p on p.id=a.user_id join auth.users u on u.id=a.user_id
        where a.firm_id=${scope.firmId} and a.matter_id=${matterId} and a.deleted_at is null
        ${afterId ? tx`and a.user_id > ${afterId}::uuid` : tx``} order by a.user_id limit 21 for share of a,fm,u`;
      const items = rows.slice(0, 20);
      return matterAccessListSchema.parse({
        ...scope,
        matterId,
        items,
        nextCursor: rows.length > 20 ? items.at(-1)!.userId : null,
      });
    });
  }
  async candidates(actor: AuthClaims, matterId: string, afterId?: string) {
    return this.database.sql.begin(async (tx) => {
      const { firmId } = await this.manager(tx, actor, matterId);
      const rows = await tx<
        Omit<MatterAccessCandidates['items'][number], 'canManage'>[]
      >`select fm.user_id as "userId", p.full_name as name, u.email, fm.role as "staffRole"
        from firm_members fm join profiles p on p.id=fm.user_id join auth.users u on u.id=fm.user_id
        where fm.firm_id=${firmId} and fm.deleted_at is null and u.deleted_at is null and u.email_confirmed_at is not null
        and (u.banned_until is null or u.banned_until <= clock_timestamp())
        ${afterId ? tx`and fm.user_id > ${afterId}::uuid` : tx``} order by fm.user_id limit 21 for share of fm,u`;
      const items = rows
        .slice(0, 20)
        .map((r) => ({ ...r, canManage: canManage(r.staffRole as FirmRole) }));
      return matterAccessCandidatesSchema.parse({
        firmId,
        matterId,
        items,
        nextCursor: rows.length > 20 ? items.at(-1)!.userId : null,
      });
    });
  }
  async history(actor: AuthClaims, matterId: string, cursor: MatterAccessHistoryQuery) {
    return this.database.sql.begin(async (tx) => {
      const { firmId } = await this.manager(tx, actor, matterId);
      const rows =
        await tx`select id, command_id as "commandId", created_by as "actorId", after->>'userId' as "userId",
        before->>'role' as "previousRole", after->>'role' as role, (after->>'accessRevision')::int as revision, after->>'reason' as reason,
        to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAt"
        from audit_logs where firm_id=${firmId} and record_type='matter' and record_id=${matterId} and action='matter.access.change.v1'
        ${cursor.beforeId ? tx`and (created_at,id) < (${cursor.beforeCreatedAt!}::timestamptz,${cursor.beforeId}::uuid)` : tx``}
        order by created_at desc,id desc limit 21`;
      const items = rows.slice(0, 20),
        last = items.at(-1);
      return matterAccessHistorySchema.parse({
        firmId,
        matterId,
        items,
        nextCursor:
          rows.length > 20 ? { beforeId: last!.id, beforeCreatedAt: last!.createdAt } : null,
      });
    });
  }
  async change(
    actor: AuthClaims,
    matterId: string,
    input: ChangeMatterAccess,
    key: string,
    requestId: string,
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ matterId, ...input }))
      .digest('hex');
    const outcome = await this.database.sql.begin(async (tx) => {
      const scope = await this.manager(tx, actor, matterId, true);
      const [recipient] = await tx`select fm.role,
        (fm.deleted_at is null and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp())) as active
        from firm_members fm join auth.users u on u.id=fm.user_id
        where fm.firm_id=${scope.firmId} and fm.user_id=${input.userId} for share of fm,u`;
      if (!recipient || (input.role !== null && !recipient.active))
        throw new NotFoundException({
          code: 'STAFF_UNAVAILABLE',
          message: 'This staff assignment is unavailable.',
        });
      if (input.role === 'manager' && !canManage(recipient.role as FirmRole))
        throw conflict('MANAGER_ROLE_REQUIRED', 'This staff role cannot manage matter access.');
      const [grant] =
        await tx`select id,role,revision,deleted_at from matter_access where firm_id=${scope.firmId} and matter_id=${matterId} and user_id=${input.userId} for update`;
      const currentRole = grant && !grant.deleted_at ? grant.role : null;
      const [receipt] =
        await tx`select input_hash,response from command_receipts where firm_id=${scope.firmId} and created_by=${actor.sub} and command=${command} and idempotency_key=${key}`;
      if (receipt) {
        if (receipt.input_hash !== hash)
          throw conflict(
            'IDEMPOTENCY_CONFLICT',
            'This action key was used for a different access change.',
          );
        const value = changeMatterAccessResultSchema.parse(receipt.response);
        if (value.revision !== scope.revision || currentRole !== value.role)
          throw conflict(
            'ACCESS_CHANGED',
            'Matter access changed after this request. Refresh and review the history.',
          );
        return { value, replayed: true };
      }
      if (input.expectedRevision !== scope.revision)
        throw conflict(
          'ACCESS_CHANGED',
          'Matter access changed. Refresh before preparing another change.',
        );
      if (currentRole === input.role)
        throw conflict('ACCESS_UNCHANGED', 'This assignment already has the requested access.');
      if (currentRole === 'manager' && input.role !== 'manager') {
        const managers =
          await tx`select a.user_id from matter_access a join firm_members fm on fm.firm_id=a.firm_id and fm.user_id=a.user_id
          join auth.users u on u.id=a.user_id where a.firm_id=${scope.firmId} and a.matter_id=${matterId}
          and a.user_id<>${input.userId} and a.role='manager' and a.deleted_at is null and fm.deleted_at is null
          and fm.role in ('owner','admin','attorney') and u.deleted_at is null and u.email_confirmed_at is not null
          and (u.banned_until is null or u.banned_until <= clock_timestamp()) order by a.user_id limit 1 for share of fm,u`;
        if (!managers.length)
          throw conflict(
            'LAST_MATTER_MANAGER',
            'Assign another eligible matter manager before removing this manager.',
          );
      }
      const grantRevision = grant ? Number(grant.revision) + 1 : 1;
      if (grant)
        await tx`update matter_access set role=${input.role ?? grant.role},deleted_at=${input.role === null ? new Date() : null},revision=${grantRevision} where id=${grant.id}`;
      else
        await tx`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values (${scope.firmId},${matterId},${input.userId},${input.role!},${actor.sub})`;
      const revision = scope.revision + 1;
      await tx`update matters set access_revision=${revision} where firm_id=${scope.firmId} and id=${matterId}`;
      const commandId = randomUUID();
      const value = changeMatterAccessResultSchema.parse({
        firmId: scope.firmId,
        matterId,
        userId: input.userId,
        role: input.role,
        revision,
        commandId,
      });
      await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
        values (${commandId},${scope.firmId},${actor.sub},${command},${key},${requestId},${hash},${tx.json(value)})`;
      await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
        values (${scope.firmId},${actor.sub},${commandId},${requestId},${command},'matter',${matterId},
        ${tx.json({ userId: input.userId, role: currentRole, grantRevision: grant?.revision ?? null, accessRevision: scope.revision })},
        ${tx.json({ userId: input.userId, role: input.role, grantRevision, accessRevision: revision, reason: input.reason })})`;
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
