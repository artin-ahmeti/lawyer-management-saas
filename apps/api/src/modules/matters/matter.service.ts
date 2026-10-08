import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createMatterResultSchema,
  matterSchema,
  uuidSchema,
  type CreateMatter,
  type FirmRole,
  type MatterList,
} from '@lawfirm/core';
import type postgres from 'postgres';
import { z } from 'zod';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import { StaffAccessService } from '../../common/auth/staff-access.service';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';
import {
  fieldValuesOrThrow,
  refuseUnstorable,
  sortedValues,
  versionForNewWork,
} from '../practice-profiles/profile-version';

const command = 'matter.create.v1';
const canCreate = (role: FirmRole) => ['owner', 'admin', 'attorney'].includes(role);
type MatterRow = {
  id: string;
  firm_id: string;
  title: string;
  reference: string | null;
  revision: number;
  created_at: Date;
  role: 'reader' | 'manager';
  profile_id: string | null;
  profile_name: string | null;
  profile_version: number | null;
};
/** Older receipts predate the profile summary; replays re-read the current matter anyway. */
const receiptSchema = z.object({ matter: z.object({ id: uuidSchema }), commandId: uuidSchema });
const columns = (tx: postgres.TransactionSql) =>
  tx`m.id,m.firm_id,m.title,m.reference,m.revision,m.created_at,a.role,
    p.id as profile_id,p.name as profile_name,v.version as profile_version`;
/** The pinned profile summary; values are read through the matter fields endpoint. */
const pinned = (tx: postgres.TransactionSql) =>
  tx`left join practice_profile_versions v on v.firm_id=m.firm_id and v.id=m.profile_version_id
    left join practice_profiles p on p.firm_id=v.firm_id and p.id=v.profile_id`;
const view = (r: MatterRow) =>
  matterSchema.parse({
    id: r.id,
    firmId: r.firm_id,
    title: r.title,
    reference: r.reference,
    revision: r.revision,
    createdAt: r.created_at.toISOString(),
    accessRole: r.role,
    profile:
      r.profile_id === null
        ? null
        : { id: r.profile_id, name: r.profile_name, version: r.profile_version },
  });

@Injectable()
export class MatterService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}
  private async authorized(
    tx: postgres.TransactionSql,
    actor: AuthClaims,
    firmId: string,
    matterId: string,
  ) {
    const [row] = await tx<MatterRow[]>`select ${columns(tx)}
      from matters m join matter_access a on a.firm_id=m.firm_id and a.matter_id=m.id ${pinned(tx)}
      where m.id=${matterId} and m.firm_id=${firmId} and m.deleted_at is null
        and a.user_id=${actor.sub} and a.deleted_at is null for share of m,a`;
    if (!row)
      throw new NotFoundException({
        code: 'MATTER_UNAVAILABLE',
        message: 'This matter is unavailable.',
      });
    return view(row);
  }
  async read(actor: AuthClaims, matterId: string) {
    return this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout='2s'`;
      await tx`set local statement_timeout='5s'`;
      await confirmedAccount(tx, actor.sub, 'share');
      const firm = await this.access.current(tx, actor, 'share');
      return this.authorized(tx, actor, firm.id, matterId);
    });
  }
  async list(actor: AuthClaims, afterId?: string): Promise<MatterList> {
    return this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout='2s'`;
      await tx`set local statement_timeout='5s'`;
      await confirmedAccount(tx, actor.sub, 'share');
      const firm = await this.access.current(tx, actor, 'share');
      const rows = await tx<MatterRow[]>`select ${columns(tx)}
        from matters m join matter_access a on a.firm_id=m.firm_id and a.matter_id=m.id ${pinned(tx)}
        where m.firm_id=${firm.id} and m.deleted_at is null and a.user_id=${actor.sub} and a.deleted_at is null
        ${afterId ? tx`and m.id > ${afterId}::uuid` : tx``} order by m.id limit 21 for share of m,a`;
      const items = rows.slice(0, 20).map(view);
      return {
        items,
        nextCursor: rows.length > 20 ? items.at(-1)!.id : null,
        canCreate: canCreate(firm.role),
      };
    });
  }
  async create(actor: AuthClaims, input: CreateMatter, key: string, requestId: string) {
    // Value keys are sorted in place; other keys keep their order so older receipts still match.
    const hashed = input.fieldValues
      ? { ...input, fieldValues: sortedValues(input.fieldValues) }
      : input;
    const hash = createHash('sha256').update(JSON.stringify(hashed)).digest('hex');
    const result = await this.database.sql
      .begin(async (tx) => {
        await tx`set local lock_timeout='2s'`;
        await tx`set local statement_timeout='5s'`;
        // Serialize this actor's intent with selection/bootstrap before taking domain locks.
        await confirmedAccount(tx, actor.sub, 'update');
        const firm = await this.access.current(tx, actor, 'share');
        if (!canCreate(firm.role))
          throw new ForbiddenException({
            code: 'CAPABILITY_DENIED',
            message: 'Your staff role cannot create matters.',
          });
        const [receipt] = await tx`select input_hash,response from command_receipts
        where firm_id=${firm.id} and created_by=${actor.sub} and command=${command} and idempotency_key=${key}`;
        if (receipt) {
          if (receipt.input_hash !== hash)
            throw new ConflictException({
              code: 'IDEMPOTENCY_CONFLICT',
              message: 'This action key was used for another matter.',
            });
          const value = receiptSchema.parse(receipt.response);
          // A durable receipt never substitutes for the current grant or current matter state.
          return {
            value: { ...value, matter: await this.authorized(tx, actor, firm.id, value.matter.id) },
            replayed: true,
          };
        }
        // A profile pins its current version; values are checked against that field set.
        const version = input.profileVersionId
          ? await versionForNewWork(tx, firm.id, input.profileVersionId)
          : undefined;
        const values = version
          ? fieldValuesOrThrow(version, {}, input.fieldValues ?? {}).values
          : {};
        const id = randomUUID(),
          commandId = randomUUID();
        await tx`insert into matters(id,firm_id,title,reference,profile_version_id,field_values,created_by)
        values (${id},${firm.id},${input.title},${input.reference ?? null},${version?.version_id ?? null},
          ${tx.json(values as never)},${actor.sub})`;
        await tx`insert into matter_access(firm_id,matter_id,user_id,role,created_by) values (${firm.id},${id},${actor.sub},'manager',${actor.sub})`;
        const value = createMatterResultSchema.parse({
          matter: await this.authorized(tx, actor, firm.id, id),
          commandId,
        });
        await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
        values (${commandId},${firm.id},${actor.sub},${command},${key},${requestId},${hash},${tx.json(value)})`;
        await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
        values (${firm.id},${actor.sub},${commandId},${requestId},${command},'matter',${id},'{}'::jsonb,
        ${tx.json({
          title: input.title,
          reference: input.reference ?? null,
          revision: 1,
          creatorGrant: 'manager',
          // Field values stay in the matter row; the audit names the pinned version and keys.
          ...(version
            ? { profileVersionId: version.version_id, fieldKeys: Object.keys(values).sort() }
            : {}),
        })})`;
        return { value, replayed: false };
      })
      .catch(refuseUnstorable);
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: result.value.commandId,
      firmId: result.value.matter.firmId,
      requestId,
      replayed: result.replayed,
    });
    return result.value;
  }
}
