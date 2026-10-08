import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  matterFieldsResultSchema,
  matterFieldsSchema,
  practiceFieldValuesSchema,
  uuidSchema,
  type FirmRole,
  type UpdateMatterFields,
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
  profileVersion,
  refuseUnstorable,
  sortedValues,
  versionForNewWork,
  type ProfileVersionRow,
} from './profile-version';

const command = 'matter.fields.update.v1';
/** Editing values needs a manager grant and a data-entry role (D022). */
const canEditRole = (role: FirmRole) => ['owner', 'admin', 'attorney', 'paralegal'].includes(role);
type MatterRow = {
  id: string;
  revision: number;
  profile_version_id: string | null;
  field_values: unknown;
  grant_role: 'reader' | 'manager';
};
const unavailable = () =>
  new NotFoundException({ code: 'MATTER_UNAVAILABLE', message: 'This matter is unavailable.' });
const conflict = (code: string, message: string) => new ConflictException({ code, message });
const receiptSchema = z.object({ matter: z.object({ id: uuidSchema }), commandId: uuidSchema });
const view = (
  matter: { id: string; revision: number; field_values: unknown },
  version: ProfileVersionRow | undefined,
  canEdit: boolean,
) =>
  matterFieldsSchema.parse({
    matterId: matter.id,
    revision: matter.revision,
    profile: version
      ? {
          id: version.profile_id,
          name: version.name,
          archived: version.archived_at !== null,
          version: {
            id: version.version_id,
            version: version.version,
            fields: version.fields,
            createdAt: version.version_created_at.toISOString(),
          },
        }
      : null,
    values: matter.field_values,
    canEdit,
  });

@Injectable()
export class MatterFieldsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}
  /** Lock order: account → firm membership → matter → grant → profile (D018–D022). */
  private async scope(
    tx: postgres.TransactionSql,
    actor: AuthClaims,
    matterId: string,
    write = false,
  ) {
    await tx`set local lock_timeout='2s'`;
    await tx`set local statement_timeout='5s'`;
    await confirmedAccount(tx, actor.sub, write ? 'update' : 'share');
    const firm = await this.access.current(tx, actor, 'share');
    const [matter] = await tx<
      MatterRow[]
    >`select m.id,m.revision,m.profile_version_id,m.field_values,
        a.role as grant_role
      from matters m join matter_access a on a.firm_id=m.firm_id and a.matter_id=m.id
      where m.firm_id=${firm.id} and m.id=${matterId} and m.deleted_at is null
        and a.user_id=${actor.sub} and a.deleted_at is null
      ${write ? tx`for update of m for share of a` : tx`for share of m,a`}`;
    if (!matter) throw unavailable();
    const canEdit = matter.grant_role === 'manager' && canEditRole(firm.role);
    if (write && !canEdit)
      throw new ForbiddenException({
        code: 'MATTER_FIELDS_DENIED',
        message: 'Your current role and matter grant do not allow changing matter fields.',
      });
    return { firmId: firm.id, matter, canEdit };
  }
  private async pinned(tx: postgres.TransactionSql, firmId: string, matter: MatterRow) {
    return matter.profile_version_id
      ? profileVersion(tx, firmId, matter.profile_version_id)
      : undefined;
  }
  async read(actor: AuthClaims, matterId: string) {
    return this.database.sql.begin(async (tx) => {
      const scope = await this.scope(tx, actor, matterId);
      return view(scope.matter, await this.pinned(tx, scope.firmId, scope.matter), scope.canEdit);
    });
  }
  async update(
    actor: AuthClaims,
    matterId: string,
    input: UpdateMatterFields,
    key: string,
    requestId: string,
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ matterId, ...input, values: sortedValues(input.values) }))
      .digest('hex');
    const result = await this.database.sql
      .begin(async (tx) => {
        const { firmId, matter, canEdit } = await this.scope(tx, actor, matterId, true);
        const replay = await this.receipt(tx, firmId, actor, key, hash);
        if (replay)
          return {
            value: matterFieldsResultSchema.parse({
              fields: view(matter, await this.pinned(tx, firmId, matter), canEdit),
              commandId: replay.commandId,
            }),
            firmId,
            replayed: true,
          };
        if (input.expectedRevision !== matter.revision)
          throw conflict(
            'MATTER_CHANGED',
            'This matter changed. Refresh before saving another change.',
          );
        let version: ProfileVersionRow;
        const assigning = matter.profile_version_id === null;
        if (!assigning) {
          if (input.profileVersionId && input.profileVersionId !== matter.profile_version_id)
            throw conflict(
              'PROFILE_PINNED',
              'This matter already uses a practice profile version; it cannot be replaced here.',
            );
          const pinned = await this.pinned(tx, firmId, matter);
          // Pinned versions are never deleted (D022); a missing one is unavailable, not a crash.
          if (!pinned) throw unavailable();
          version = pinned;
        } else {
          if (!input.profileVersionId)
            throw conflict('PROFILE_REQUIRED', 'Choose a practice profile for this matter first.');
          version = await versionForNewWork(tx, firmId, input.profileVersionId);
        }
        const current = practiceFieldValuesSchema.parse(matter.field_values);
        const next = fieldValuesOrThrow(version, current, input.values);
        if (!assigning && !next.changed.length)
          throw conflict('MATTER_FIELDS_UNCHANGED', 'This matter already has these values.');
        const revision = matter.revision + 1,
          commandId = randomUUID();
        const [row] = await tx<
          MatterRow[]
        >`update matters set profile_version_id=${version.version_id},
          field_values=${tx.json(next.values as never)},revision=${revision}
        where firm_id=${firmId} and id=${matterId}
        returning id,revision,profile_version_id,field_values`;
        const value = matterFieldsResultSchema.parse({
          fields: view(row!, version, canEdit),
          commandId,
        });
        // Values stay in the protected matter row; receipts and audits name keys only.
        await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
        values (${commandId},${firmId},${actor.sub},${command},${key},${requestId},${hash},${tx.json({ matter: { id: matterId }, commandId })})`;
        await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
        values (${firmId},${actor.sub},${commandId},${requestId},${command},'matter',${matterId},
        ${tx.json({ revision: matter.revision, profileVersionId: matter.profile_version_id })},
        ${tx.json({ revision, profileVersionId: version.version_id, assigned: assigning, changed: next.changed })})`;
        return { value, firmId, replayed: false };
      })
      .catch(refuseUnstorable);
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: result.value.commandId,
      firmId: result.firmId,
      requestId,
      replayed: result.replayed,
    });
    return result.value;
  }
  private async receipt(
    tx: postgres.TransactionSql,
    firmId: string,
    actor: AuthClaims,
    key: string,
    hash: string,
  ) {
    const [receipt] = await tx`select input_hash,response from command_receipts
      where firm_id=${firmId} and created_by=${actor.sub} and command=${command} and idempotency_key=${key}`;
    if (!receipt) return null;
    if (receipt.input_hash !== hash)
      throw conflict('IDEMPOTENCY_CONFLICT', 'This action key was used for another matter change.');
    return receiptSchema.parse(receipt.response);
  }
}
