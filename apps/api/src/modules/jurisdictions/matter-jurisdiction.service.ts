import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  matterJurisdictionHistoryLimit,
  matterJurisdictionLimit,
  matterJurisdictionListSchema,
  matterJurisdictionResultSchema,
  matterJurisdictionSchema,
  uuidSchema,
  type AddMatterJurisdiction,
  type EndMatterJurisdiction,
  type FirmRole,
} from '@lawfirm/core';
import type postgres from 'postgres';
import { z } from 'zod';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import { StaffAccessService } from '../../common/auth/staff-access.service';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';
import { forumUnavailable } from './forum.service';

const commands = { add: 'matter.jurisdiction.add.v1', end: 'matter.jurisdiction.end.v1' } as const;
/** Editing roles match matter field edits (D022/D023); a manager grant is also required. */
const canEdit = (role: FirmRole) => ['owner', 'admin', 'attorney', 'paralegal'].includes(role);
type ReferenceRow = {
  id: string;
  firm_id: string;
  matter_id: string;
  purpose: string;
  jurisdiction: string;
  forum_id: string | null;
  forum_name: string | null;
  forum_kind: string | null;
  forum_archived_at: Date | null;
  docket_number: string | null;
  label: string | null;
  created_at: Date;
  deleted_at: Date | null;
};
const columns = (tx: postgres.TransactionSql) =>
  tx`r.id,r.firm_id,r.matter_id,r.purpose,r.jurisdiction,r.forum_id,f.name as forum_name,
    f.kind as forum_kind,f.archived_at as forum_archived_at,r.docket_number,r.label,
    r.created_at,r.deleted_at`;
const view = (r: ReferenceRow) =>
  matterJurisdictionSchema.parse({
    id: r.id,
    firmId: r.firm_id,
    matterId: r.matter_id,
    purpose: r.purpose,
    jurisdiction: r.jurisdiction,
    forum:
      r.forum_id === null
        ? null
        : {
            id: r.forum_id,
            name: r.forum_name,
            kind: r.forum_kind,
            archived: r.forum_archived_at !== null,
          },
    docketNumber: r.docket_number,
    label: r.label,
    automation: 'none',
    createdAt: r.created_at.toISOString(),
    endedAt: r.deleted_at?.toISOString() ?? null,
  });
/** Receipts keep identifiers only, never docket numbers or labels; replays re-read the row. */
const receiptSchema = z.object({ reference: z.object({ id: uuidSchema }), commandId: uuidSchema });
const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Identifiers are compared as uuids, so a retry that changes their case is the same intent. */
const lower = (id: string | undefined) => id?.toLowerCase();
const conflict = (code: string, message: string) => new ConflictException({ code, message });
const matterUnavailable = () =>
  new NotFoundException({ code: 'MATTER_UNAVAILABLE', message: 'This matter is unavailable.' });
const referenceUnavailable = () =>
  new NotFoundException({
    code: 'REFERENCE_UNAVAILABLE',
    message: 'This jurisdiction reference is unavailable.',
  });

@Injectable()
export class MatterJurisdictionService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}
  /**
   * Lock order: account → firm membership → matter → grant → forum/reference (D018–D023).
   * Adding holds the matter so the per-matter limit is counted without a race; ending and
   * reading only share it.
   */
  private async scope(
    tx: postgres.TransactionSql,
    actor: AuthClaims,
    matterId: string,
    write: false | 'add' | 'end' = false,
  ) {
    await tx`set local lock_timeout='2s'`;
    await tx`set local statement_timeout='5s'`;
    await confirmedAccount(tx, actor.sub, write ? 'update' : 'share');
    const firm = await this.access.current(tx, actor, 'share');
    const [grant] = await tx`select a.role from matters m join matter_access a
      on a.firm_id=m.firm_id and a.matter_id=m.id
      where m.firm_id=${firm.id} and m.id=${matterId} and m.deleted_at is null
        and a.user_id=${actor.sub} and a.deleted_at is null
      ${write === 'add' ? tx`for no key update of m for share of a` : tx`for share of m,a`}`;
    if (!grant) throw matterUnavailable();
    const manages = grant.role === 'manager' && canEdit(firm.role);
    if (write && !manages)
      throw new ForbiddenException({
        code: 'MATTER_JURISDICTION_MANAGEMENT_DENIED',
        message: 'Your current role and matter grant do not allow changing jurisdictions.',
      });
    return { firmId: firm.id, canManage: manages };
  }
  private async reference(
    tx: postgres.TransactionSql,
    firmId: string,
    matterId: string,
    id: string,
    lock = false,
  ) {
    // Lock the reference alone first, then read the joined forum (a locked join can drop rows).
    if (lock)
      await tx`select id from matter_jurisdictions
        where firm_id=${firmId} and matter_id=${matterId} and id=${id} for update`;
    const [row] = await tx<ReferenceRow[]>`select ${columns(tx)}
      from matter_jurisdictions r left join forums f on f.firm_id=r.firm_id and f.id=r.forum_id
      where r.firm_id=${firmId} and r.matter_id=${matterId} and r.id=${id}`;
    return row;
  }
  async list(actor: AuthClaims, matterId: string) {
    return this.database.sql.begin(async (tx) => {
      const scope = await this.scope(tx, actor, matterId);
      const rows = await tx<ReferenceRow[]>`select ${columns(tx)}
        from matter_jurisdictions r left join forums f on f.firm_id=r.firm_id and f.id=r.forum_id
        where r.firm_id=${scope.firmId} and r.matter_id=${matterId} and r.deleted_at is null
        order by r.created_at,r.id limit ${matterJurisdictionLimit}`;
      return matterJurisdictionListSchema.parse({
        matterId: matterId.toLowerCase(),
        items: rows.map(view),
        canManage: scope.canManage,
      });
    });
  }
  async add(
    actor: AuthClaims,
    matterId: string,
    input: AddMatterJurisdiction,
    key: string,
    requestId: string,
  ) {
    const hash = hashOf({ ...input, matterId: lower(matterId), forumId: lower(input.forumId) });
    const result = await this.database.sql
      .begin(async (tx) => {
        const scope = await this.scope(tx, actor, matterId, 'add');
        const replay = await this.receipt(tx, scope.firmId, actor, commands.add, key, hash);
        if (replay) {
          const row = await this.reference(tx, scope.firmId, matterId, replay.reference.id);
          return {
            value: matterJurisdictionResultSchema.parse({
              reference: view(row!),
              commandId: replay.commandId,
            }),
            replayed: true,
          };
        }
        if (input.forumId) {
          // Share-locked so a concurrent archive waits for this reference.
          const [forum] = await tx<
            { jurisdiction: string; archived_at: Date | null }[]
          >`select jurisdiction,archived_at from forums
            where firm_id=${scope.firmId} and id=${input.forumId} for share`;
          if (!forum) throw forumUnavailable();
          if (forum.archived_at)
            throw conflict('FORUM_ARCHIVED', 'This forum is archived. Choose an active forum.');
          if (forum.jurisdiction !== input.jurisdiction)
            throw new UnprocessableEntityException({
              code: 'FORUM_JURISDICTION_MISMATCH',
              message: 'This forum belongs to another jurisdiction.',
            });
        }
        const [held] = await tx<{ current: number; total: number }[]>`select
            count(*) filter (where deleted_at is null)::int as current,count(*)::int as total
          from matter_jurisdictions where firm_id=${scope.firmId} and matter_id=${matterId}`;
        if (held!.current >= matterJurisdictionLimit)
          throw conflict(
            'REFERENCE_LIMIT',
            `A matter holds at most ${matterJurisdictionLimit} current jurisdiction references.`,
          );
        if (held!.total >= matterJurisdictionHistoryLimit)
          throw conflict(
            'REFERENCE_HISTORY_LIMIT',
            'This matter has reached its jurisdiction history limit. Contact your administrator.',
          );
        const commandId = randomUUID();
        const [inserted] = await tx<{ id: string }[]>`insert into matter_jurisdictions
            (firm_id,matter_id,purpose,jurisdiction,forum_id,docket_number,label,created_by)
          values (${scope.firmId},${matterId},${input.purpose},${input.jurisdiction},
            ${input.forumId ?? null},${input.docketNumber ?? null},${input.label ?? null},${actor.sub})
          returning id`;
        const value = matterJurisdictionResultSchema.parse({
          reference: view((await this.reference(tx, scope.firmId, matterId, inserted!.id))!),
          commandId,
        });
        await this.record(
          tx,
          scope.firmId,
          actor,
          commands.add,
          key,
          requestId,
          hash,
          value,
          {},
          {
            referenceId: value.reference.id,
            purpose: input.purpose,
            jurisdiction: input.jurisdiction,
            forumId: input.forumId ?? null,
          },
        );
        return { value, replayed: false };
      })
      .catch((error: { code?: string; constraint_name?: string }) => {
        // Another request added the same reference first; the partial unique index decides.
        if (error.code === '23505' && error.constraint_name === 'matter_jurisdictions_current_uq')
          throw conflict('REFERENCE_EXISTS', 'This matter already holds this reference.');
        throw error;
      });
    this.completed(commands.add, result, requestId);
    return result.value;
  }
  async end(
    actor: AuthClaims,
    matterId: string,
    input: EndMatterJurisdiction,
    key: string,
    requestId: string,
  ) {
    const hash = hashOf({ matterId: lower(matterId), referenceId: lower(input.referenceId) });
    const result = await this.database.sql.begin(async (tx) => {
      const scope = await this.scope(tx, actor, matterId, 'end');
      const current = await this.reference(tx, scope.firmId, matterId, input.referenceId, true);
      if (!current) throw referenceUnavailable();
      const replay = await this.receipt(tx, scope.firmId, actor, commands.end, key, hash);
      if (replay)
        return {
          value: matterJurisdictionResultSchema.parse({
            reference: view(current),
            commandId: replay.commandId,
          }),
          replayed: true,
        };
      if (current.deleted_at)
        throw conflict('REFERENCE_ENDED', 'This jurisdiction reference has already ended.');
      const commandId = randomUUID();
      await tx`update matter_jurisdictions set deleted_at=clock_timestamp() where id=${current.id}`;
      const ended = (await this.reference(tx, scope.firmId, matterId, current.id))!;
      const value = matterJurisdictionResultSchema.parse({ reference: view(ended), commandId });
      const identity = {
        referenceId: current.id,
        purpose: current.purpose,
        jurisdiction: current.jurisdiction,
        forumId: current.forum_id,
      };
      await this.record(
        tx,
        scope.firmId,
        actor,
        commands.end,
        key,
        requestId,
        hash,
        value,
        { ...identity, endedAt: null },
        { ...identity, endedAt: value.reference.endedAt },
      );
      return { value, replayed: false };
    });
    this.completed(commands.end, result, requestId);
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
      throw conflict(
        'IDEMPOTENCY_CONFLICT',
        'This action key was used for another jurisdiction change.',
      );
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
    value: { reference: { id: string; matterId: string }; commandId: string },
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
      values (${value.commandId},${firmId},${actor.sub},${command},${key},${requestId},${hash},
        ${tx.json({ reference: { id: value.reference.id }, commandId: value.commandId })})`;
    await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
      values (${firmId},${actor.sub},${value.commandId},${requestId},${command},'matter',${value.reference.matterId},
      ${tx.json(before as never)},${tx.json(after as never)})`;
  }
  private completed(
    command: string,
    result: { value: { commandId: string; reference: { firmId: string } }; replayed: boolean },
    requestId: string,
  ) {
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: result.value.commandId,
      firmId: result.value.reference.firmId,
      requestId,
      replayed: result.replayed,
    });
  }
}
