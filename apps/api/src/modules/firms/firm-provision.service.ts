import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  provisionFirmResultSchema,
  type ProvisionFirm,
  type ProvisionFirmResult,
} from '@lawfirm/core';
import { DatabaseService } from '../../common/database/database.module';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { log } from '../../common/http';
import { confirmedAccount } from '../../common/auth/confirmed-account';

const command = 'firm.provision.v1';
@Injectable()
export class FirmProvisionService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  async provision(
    actor: AuthClaims,
    input: ProvisionFirm,
    key: string,
    requestId: string,
  ): Promise<ProvisionFirmResult> {
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const result = await this.database.sql.begin(async (tx) => {
      await tx`set local statement_timeout = '5s'`;
      await tx`set local lock_timeout = '2s'`;
      // Bootstrap has no active firm yet. Serialize all initial-creation intents on the verified account.
      await confirmedAccount(tx, actor.sub, 'update');
      const [receipt] = await tx`select firm_id, input_hash, response from public.command_receipts
        where created_by = ${actor.sub} and command = ${command} and idempotency_key = ${key}`;
      if (receipt) {
        await tx`select id from firms where id=${receipt.firm_id} and deleted_at is null for share`;
        const [member] =
          await tx`select fm.id from public.firm_members fm join public.firms f on f.id = fm.firm_id
          where fm.firm_id = ${receipt.firm_id} and fm.user_id = ${actor.sub} and fm.deleted_at is null and f.deleted_at is null for share of fm`;
        if (!member)
          throw new ForbiddenException({
            code: 'FIRM_ACCESS_DENIED',
            message: 'You no longer have access to this firm.',
          });
        if (receipt.input_hash !== hash)
          throw new ConflictException({
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'This action key was used for a different firm name.',
          });
        return { value: provisionFirmResultSchema.parse(receipt.response), replayed: true };
      }
      const [existing] =
        await tx`select fm.id from public.firm_members fm join public.firms f on f.id = fm.firm_id
        where fm.user_id = ${actor.sub} and fm.deleted_at is null and f.deleted_at is null limit 1`;
      if (existing)
        throw new ConflictException({
          code: 'STAFF_MEMBERSHIP_EXISTS',
          message: 'You already belong to a firm. Refresh your firm access.',
        });
      const firmId = randomUUID();
      const commandId = randomUUID();
      const value = provisionFirmResultSchema.parse({
        firmId,
        commandId,
        requiresSessionRefresh: true,
      });
      await tx`insert into public.firms (id, name, revision) values (${firmId}, ${input.name}, 1)`;
      await tx`insert into public.firm_members (firm_id, user_id, role, created_by) values (${firmId}, ${actor.sub}, 'owner', ${actor.sub})`;
      await tx`insert into public.command_receipts (id, firm_id, created_by, command, idempotency_key, request_id, input_hash, response)
        values (${commandId}, ${firmId}, ${actor.sub}, ${command}, ${key}, ${requestId}, ${hash}, ${tx.json(value)})`;
      await tx`insert into public.audit_logs (firm_id, created_by, command_id, request_id, action, record_type, record_id, before, after)
        values (${firmId}, ${actor.sub}, ${commandId}, ${requestId}, ${command}, 'firm', ${firmId}, '{}'::jsonb,
        ${tx.json({ name: input.name, revision: 1, ownerId: actor.sub })})`;
      await tx`insert into public.outbox_events (firm_id, created_by, command_id, request_id, event_type, payload)
        values (${firmId}, ${actor.sub}, ${commandId}, ${requestId}, 'firm.profile-check-requested.v1', ${tx.json({ firmId, revision: 1 })})`;
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
