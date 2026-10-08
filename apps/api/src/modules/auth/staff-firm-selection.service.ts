import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  activeFirmSelectionSchema,
  selectStaffFirmResultSchema,
  type SelectStaffFirm,
} from '@lawfirm/core';
import type postgres from 'postgres';
import { DatabaseService } from '../../common/database/database.module';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { log } from '../../common/http';

const command = 'staff.context.select.v1';
type SelectionRow = { id: string; firm_id: string; revision: number; deleted_at: Date | null };
@Injectable()
export class StaffFirmSelectionService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  private async accountSession(
    tx: postgres.TransactionSql,
    actor: AuthClaims,
    lock: 'share' | 'update',
  ) {
    await confirmedAccount(tx, actor.sub, lock);
    if (!actor.session_id)
      throw new ForbiddenException({
        code: 'SESSION_UNAVAILABLE',
        message: 'Sign in again to select a workspace.',
      });
    const [session] =
      await tx`select id from auth.sessions where id=${actor.session_id} and user_id=${actor.sub}
      and (not_after is null or not_after > clock_timestamp()) for share`;
    if (!session)
      throw new ForbiddenException({
        code: 'SESSION_UNAVAILABLE',
        message: 'Sign in again to select a workspace.',
      });
    return actor.session_id;
  }
  async current(actor: AuthClaims) {
    return this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout='2s'`;
      await tx`set local statement_timeout='5s'`;
      const sessionId = await this.accountSession(tx, actor, 'share');
      const [selection] = await tx<
        SelectionRow[]
      >`select id,firm_id,revision,deleted_at from staff_session_contexts where session_id=${sessionId} and created_by=${actor.sub} for share`;
      const [member] =
        await tx`select fm.firm_id from firm_members fm join firms f on f.id=fm.firm_id
        where fm.user_id=${actor.sub} and fm.deleted_at is null and f.deleted_at is null
        ${selection ? tx`and fm.firm_id=${selection.firm_id} and ${selection.deleted_at === null}` : tx``}
        order by fm.created_at,fm.id limit 1`;
      return activeFirmSelectionSchema.parse({
        userId: actor.sub,
        firmId: member?.firm_id,
        revision: selection?.revision ?? 0,
      });
    });
  }
  async select(actor: AuthClaims, input: SelectStaffFirm, key: string, requestId: string) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ sessionId: actor.session_id, ...input }))
      .digest('hex');
    const result = await this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout='2s'`;
      await tx`set local statement_timeout='5s'`;
      // Shared account lock serializes selection, bootstrap and invitation acceptance.
      const sessionId = await this.accountSession(tx, actor, 'update');
      await tx`select id from firms where id=${input.firmId} and deleted_at is null for share`;
      const [member] = await tx`select fm.id from firm_members fm join firms f on f.id=fm.firm_id
        where fm.user_id=${actor.sub} and fm.firm_id=${input.firmId} and fm.deleted_at is null and f.deleted_at is null for share of fm`;
      if (!member)
        throw new ForbiddenException({
          code: 'FIRM_ACCESS_DENIED',
          message: 'Workspace access unavailable.',
        });
      const [selection] = await tx<
        SelectionRow[]
      >`select id,firm_id,revision,deleted_at from staff_session_contexts where session_id=${sessionId} and created_by=${actor.sub} for update`;
      const [receipt] =
        await tx`select input_hash,response from command_receipts where created_by=${actor.sub} and command=${command} and idempotency_key=${key}`;
      if (receipt) {
        if (receipt.input_hash !== hash)
          throw new ConflictException({
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'This action key was used for another selection.',
          });
        const value = selectStaffFirmResultSchema.parse(receipt.response);
        if (
          !selection ||
          selection.deleted_at ||
          selection.firm_id !== value.firmId ||
          selection.revision !== value.revision
        )
          throw new ConflictException({
            code: 'CONTEXT_CHANGED',
            message: 'The workspace selection changed. Refresh before selecting again.',
          });
        return { value, replayed: true };
      }
      if (selection?.deleted_at || (selection?.revision ?? 0) !== input.expectedRevision)
        throw new ConflictException({
          code: 'CONTEXT_CHANGED',
          message: 'The workspace selection changed. Refresh before selecting again.',
        });
      const commandId = randomUUID(),
        recordId = selection?.id ?? randomUUID(),
        revision = (selection?.revision ?? 0) + 1;
      const value = selectStaffFirmResultSchema.parse({
        userId: actor.sub,
        firmId: input.firmId,
        revision,
        commandId,
        requiresSessionRefresh: true,
      });
      if (selection)
        await tx`update staff_session_contexts set firm_id=${input.firmId},revision=${revision},updated_at=clock_timestamp() where id=${recordId}`;
      else
        await tx`insert into staff_session_contexts(id,session_id,firm_id,revision,created_by) values (${recordId},${sessionId},${input.firmId},${revision},${actor.sub})`;
      await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
        values (${commandId},${input.firmId},${actor.sub},${command},${key},${requestId},${hash},${tx.json(value)})`;
      // Audit only scope/revision; no device details or previous firm's private name.
      await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
        values (${input.firmId},${actor.sub},${commandId},${requestId},${command},'staff_session_context',${recordId},
        ${tx.json({ revision: selection?.revision ?? 0 })},${tx.json({ firmId: input.firmId, revision })})`;
      return { value, replayed: false };
    });
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: result.value.commandId,
      firmId: result.value.firmId,
      requestId,
      replayed: result.replayed,
    });
    return result.value;
  }
}
