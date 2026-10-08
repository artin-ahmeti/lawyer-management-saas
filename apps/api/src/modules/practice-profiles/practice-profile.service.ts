import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  practiceFieldListSchema,
  practiceProfileDetailSchema,
  practiceProfileListSchema,
  practiceProfileResultSchema,
  practiceProfileSchema,
  practiceStarters,
  uuidSchema,
  type CreatePracticeProfile,
  type FirmRole,
  type PracticeFieldDefinition,
  type PracticeProfileListQuery,
  type RevisePracticeProfile,
} from '@lawfirm/core';
import type postgres from 'postgres';
import { z } from 'zod';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import { StaffAccessService } from '../../common/auth/staff-access.service';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';
import { profileUnavailable, refuseUnstorable } from './profile-version';

const commands = {
  create: 'practice_profile.create.v1',
  revise: 'practice_profile.revise.v1',
} as const;
/** Profile administration is firm configuration (D022); every live role reads profiles. */
export const canManageProfiles = (role: FirmRole) => ['owner', 'admin'].includes(role);
type ProfileRow = {
  id: string;
  firm_id: string;
  name: string;
  description: string | null;
  based_on_key: string | null;
  based_on_version: number | null;
  current_version: number;
  revision: number;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
  version_id: string;
  fields: unknown;
  version_created_at: Date;
};
const columns = (tx: postgres.TransactionSql) =>
  tx`p.id,p.firm_id,p.name,p.description,p.based_on_key,p.based_on_version,p.current_version,
    p.revision,p.archived_at,p.created_at,p.updated_at,v.id as version_id,v.fields,
    v.created_at as version_created_at`;
const core = (r: Omit<ProfileRow, 'version_id' | 'fields' | 'version_created_at'>) => ({
  id: r.id,
  firmId: r.firm_id,
  name: r.name,
  description: r.description,
  basedOn: r.based_on_key === null ? null : { key: r.based_on_key, version: r.based_on_version },
  archived: r.archived_at !== null,
  revision: r.revision,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});
const view = (r: ProfileRow) =>
  practiceProfileSchema.parse({
    ...core(r),
    currentVersion: {
      id: r.version_id,
      version: r.current_version,
      fields: r.fields,
      createdAt: r.version_created_at.toISOString(),
    },
  });
/** Receipts keep identifiers only; replays re-read the current profile. */
const receiptSchema = z.object({ profile: z.object({ id: uuidSchema }), commandId: uuidSchema });
const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** jsonb reorders object keys, so compare field sets with sorted keys. */
const canonical = (fields: PracticeFieldDefinition[]) =>
  JSON.stringify(fields.map((f) => Object.fromEntries(Object.entries(f).sort())));
const nameTaken = (error: { code?: string; constraint_name?: string }) => {
  // Another active profile holds the name; the partial unique index decides under races.
  if (error.code === '23505' && error.constraint_name === 'practice_profiles_active_name_uq')
    throw new ConflictException({
      code: 'PROFILE_NAME_TAKEN',
      message: 'An active practice profile already uses this name.',
    });
  return refuseUnstorable(error);
};

@Injectable()
export class PracticeProfileService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}
  private async scope(tx: postgres.TransactionSql, actor: AuthClaims, write = false) {
    await tx`set local lock_timeout='2s'`;
    await tx`set local statement_timeout='5s'`;
    // Serialize this actor's intent with selection/bootstrap before taking domain locks.
    await confirmedAccount(tx, actor.sub, write ? 'update' : 'share');
    const firm = await this.access.current(tx, actor, 'share');
    if (write && !canManageProfiles(firm.role))
      throw new ForbiddenException({
        code: 'CAPABILITY_DENIED',
        message: 'Your staff role cannot change practice profiles.',
      });
    return firm;
  }
  private async profile(
    tx: postgres.TransactionSql,
    firmId: string,
    profileId: string,
    lock: 'update' | 'none' = 'none',
  ) {
    // Lock the profile alone first: a locked join re-checks only the locked row after a wait,
    // so a joined version from before a concurrent revision would drop the row.
    if (lock === 'update')
      await tx`select id from practice_profiles where firm_id=${firmId} and id=${profileId} for update`;
    const [row] = await tx<ProfileRow[]>`select ${columns(tx)}
      from practice_profiles p join practice_profile_versions v
        on v.firm_id=p.firm_id and v.profile_id=p.id and v.version=p.current_version
      where p.firm_id=${firmId} and p.id=${profileId} and p.deleted_at is null`;
    if (!row) throw profileUnavailable();
    return row;
  }
  async list(actor: AuthClaims, query: PracticeProfileListQuery) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.scope(tx, actor);
      // The list counts fields without reading each version's definitions.
      const rows = await tx<
        (Omit<ProfileRow, 'version_id' | 'fields' | 'version_created_at'> & {
          field_count: number;
        })[]
      >`select p.id,p.firm_id,p.name,p.description,p.based_on_key,p.based_on_version,p.current_version,
          p.revision,p.archived_at,p.created_at,p.updated_at,jsonb_array_length(v.fields) as field_count
        from practice_profiles p join practice_profile_versions v
          on v.firm_id=p.firm_id and v.profile_id=p.id and v.version=p.current_version
        where p.firm_id=${firm.id} and p.deleted_at is null
          and ${query.status === 'archived' ? tx`p.archived_at is not null` : tx`p.archived_at is null`}
        ${query.afterId ? tx`and (lower(p.name),p.id) > (lower(${query.afterName!}),${query.afterId}::uuid)` : tx``}
        order by lower(p.name),p.id limit 21`;
      const items = rows.slice(0, 20).map((r) => ({
        ...core(r),
        currentVersion: r.current_version,
        fieldCount: r.field_count,
      }));
      const last = items.at(-1);
      return practiceProfileListSchema.parse({
        items,
        nextCursor: rows.length > 20 ? { afterName: last!.name, afterId: last!.id } : null,
        canManage: canManageProfiles(firm.role),
      });
    });
  }
  async read(actor: AuthClaims, profileId: string) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.scope(tx, actor);
      return practiceProfileDetailSchema.parse({
        profile: view(await this.profile(tx, firm.id, profileId)),
        canManage: canManageProfiles(firm.role),
      });
    });
  }
  async create(actor: AuthClaims, input: CreatePracticeProfile, key: string, requestId: string) {
    const hash = hashOf(input);
    const result = await this.database.sql
      .begin(async (tx) => {
        const firm = await this.scope(tx, actor, true);
        const replay = await this.receipt(tx, firm.id, actor, commands.create, key, hash);
        if (replay)
          return {
            value: practiceProfileResultSchema.parse({
              profile: view(await this.profile(tx, firm.id, replay.profile.id)),
              commandId: replay.commandId,
            }),
            replayed: true,
          };
        // Only new work checks the starter: a committed create still replays after a starter changes.
        if (input.basedOn && practiceStarters[input.basedOn.key].version !== input.basedOn.version)
          throw new UnprocessableEntityException({
            code: 'STARTER_UNAVAILABLE',
            message: 'This starter profile version is unavailable.',
          });
        const id = randomUUID(),
          commandId = randomUUID();
        await tx`insert into practice_profiles(id,firm_id,name,description,based_on_key,based_on_version,created_by)
          values (${id},${firm.id},${input.name},${input.description ?? null},
            ${input.basedOn?.key ?? null},${input.basedOn?.version ?? null},${actor.sub})`;
        await tx`insert into practice_profile_versions(firm_id,profile_id,version,fields,created_by)
          values (${firm.id},${id},1,${tx.json(input.fields as never)},${actor.sub})`;
        const value = practiceProfileResultSchema.parse({
          profile: view(await this.profile(tx, firm.id, id)),
          commandId,
        });
        await this.record(
          tx,
          firm.id,
          actor,
          commands.create,
          key,
          requestId,
          hash,
          value,
          {},
          {
            name: input.name,
            description: input.description ?? null,
            basedOn: input.basedOn ?? null,
            version: 1,
            fieldKeys: input.fields.map((f) => f.key),
            revision: 1,
          },
        );
        return { value, replayed: false };
      })
      .catch(nameTaken);
    this.completed(commands.create, result, requestId);
    return result.value;
  }
  async revise(
    actor: AuthClaims,
    profileId: string,
    input: RevisePracticeProfile,
    key: string,
    requestId: string,
  ) {
    const hash = hashOf({ profileId, ...input });
    const result = await this.database.sql
      .begin(async (tx) => {
        const firm = await this.scope(tx, actor, true);
        const current = await this.profile(tx, firm.id, profileId, 'update');
        const replay = await this.receipt(tx, firm.id, actor, commands.revise, key, hash);
        if (replay)
          return {
            value: practiceProfileResultSchema.parse({
              profile: view(current),
              commandId: replay.commandId,
            }),
            replayed: true,
          };
        if (input.expectedRevision !== current.revision)
          throw new ConflictException({
            code: 'PROFILE_CHANGED',
            message: 'This practice profile changed. Refresh before saving another change.',
          });
        const currentFields = practiceFieldListSchema.parse(current.fields);
        const next = {
          name: input.name ?? current.name,
          description: input.description === undefined ? current.description : input.description,
          archived: input.archived ?? current.archived_at !== null,
        };
        const fieldsChanged =
          input.fields !== undefined && canonical(input.fields) !== canonical(currentFields);
        const changed = [
          next.name !== current.name && 'name',
          next.description !== current.description && 'description',
          fieldsChanged && 'fields',
          next.archived !== (current.archived_at !== null) && 'archived',
        ].filter((c): c is string => typeof c === 'string');
        if (!changed.length)
          throw new ConflictException({
            code: 'PROFILE_UNCHANGED',
            message: 'This practice profile already has these details.',
          });
        const version = fieldsChanged ? current.current_version + 1 : current.current_version;
        const revision = current.revision + 1,
          commandId = randomUUID();
        if (fieldsChanged)
          await tx`insert into practice_profile_versions(firm_id,profile_id,version,fields,created_by)
            values (${firm.id},${profileId},${version},${tx.json(input.fields as never)},${actor.sub})`;
        await tx`update practice_profiles set name=${next.name},description=${next.description},
            current_version=${version},revision=${revision},
            archived_at=${next.archived ? tx`coalesce(archived_at,clock_timestamp())` : null}
          where firm_id=${firm.id} and id=${profileId}`;
        const value = practiceProfileResultSchema.parse({
          profile: view(await this.profile(tx, firm.id, profileId)),
          commandId,
        });
        await this.record(
          tx,
          firm.id,
          actor,
          commands.revise,
          key,
          requestId,
          hash,
          value,
          {
            name: current.name,
            description: current.description,
            version: current.current_version,
            archived: current.archived_at !== null,
            revision: current.revision,
          },
          {
            name: next.name,
            description: next.description,
            version,
            archived: next.archived,
            revision,
            changed,
            ...(fieldsChanged ? { fieldKeys: input.fields!.map((f) => f.key) } : {}),
          },
        );
        return { value, replayed: false };
      })
      .catch(nameTaken);
    this.completed(commands.revise, result, requestId);
    return result.value;
  }
  private async receipt(
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
      throw new ConflictException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'This action key was used for another practice profile change.',
      });
    return receiptSchema.parse(receipt.response);
  }
  private async record(
    tx: postgres.TransactionSql,
    firmId: string,
    actor: AuthClaims,
    command: string,
    key: string,
    requestId: string,
    hash: string,
    value: { profile: { id: string }; commandId: string },
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
      values (${value.commandId},${firmId},${actor.sub},${command},${key},${requestId},${hash},${tx.json({ profile: { id: value.profile.id }, commandId: value.commandId })})`;
    await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
      values (${firmId},${actor.sub},${value.commandId},${requestId},${command},'practice_profile',${value.profile.id},
      ${tx.json(before as never)},${tx.json(after as never)})`;
  }
  private completed(
    command: string,
    result: { value: { commandId: string; profile: { firmId: string } }; replayed: boolean },
    requestId: string,
  ) {
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: result.value.commandId,
      firmId: result.value.profile.firmId,
      requestId,
      replayed: result.replayed,
    });
  }
}
