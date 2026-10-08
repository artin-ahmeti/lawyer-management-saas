import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  forumListSchema,
  forumResultSchema,
  forumSchema,
  uuidSchema,
  type CreateForum,
  type FirmRole,
  type ForumListQuery,
  type UpdateForum,
} from '@lawfirm/core';
import type postgres from 'postgres';
import { z } from 'zod';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import { StaffAccessService } from '../../common/auth/staff-access.service';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';

const commands = { create: 'forum.create.v1', update: 'forum.update.v1' } as const;
/** Staff who open matters may add the forum they appear in; renaming and archiving is admin (D023). */
export const canCreateForums = (role: FirmRole) =>
  ['owner', 'admin', 'attorney', 'paralegal'].includes(role);
export const canManageForums = (role: FirmRole) => ['owner', 'admin'].includes(role);
type ForumRow = {
  id: string;
  firm_id: string;
  name: string;
  kind: string;
  jurisdiction: string;
  revision: number;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
const view = (r: ForumRow) =>
  forumSchema.parse({
    id: r.id,
    firmId: r.firm_id,
    name: r.name,
    kind: r.kind,
    jurisdiction: r.jurisdiction,
    archived: r.archived_at !== null,
    revision: r.revision,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  });
/** Receipts keep identifiers only; replays re-read the current forum. */
const receiptSchema = z.object({ forum: z.object({ id: uuidSchema }), commandId: uuidSchema });
const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const forumUnavailable = () =>
  new NotFoundException({ code: 'FORUM_UNAVAILABLE', message: 'This forum is unavailable.' });
const denied = (message: string) => new ForbiddenException({ code: 'CAPABILITY_DENIED', message });
const nameTaken = (error: { code?: string; constraint_name?: string }): never => {
  // Another active forum in the jurisdiction holds the name; the partial unique index decides.
  if (error.code === '23505' && error.constraint_name === 'forums_active_name_uq')
    throw new ConflictException({
      code: 'FORUM_NAME_TAKEN',
      message: 'An active forum in this jurisdiction already uses this name.',
    });
  throw error;
};

@Injectable()
export class ForumService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}
  private async scope(tx: postgres.TransactionSql, actor: AuthClaims, write = false) {
    await tx`set local lock_timeout='2s'`;
    await tx`set local statement_timeout='5s'`;
    // Serialize this actor's intent with selection/bootstrap before taking domain locks.
    await confirmedAccount(tx, actor.sub, write ? 'update' : 'share');
    return this.access.current(tx, actor, 'share');
  }
  private async forum(tx: postgres.TransactionSql, firmId: string, forumId: string, lock = false) {
    const [row] = await tx<ForumRow[]>`select id,firm_id,name,kind,jurisdiction,revision,
        archived_at,created_at,updated_at
      from forums where firm_id=${firmId} and id=${forumId} ${lock ? tx`for update` : tx``}`;
    if (!row) throw forumUnavailable();
    return row;
  }
  async list(actor: AuthClaims, query: ForumListQuery) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.scope(tx, actor);
      const rows = await tx<ForumRow[]>`select id,firm_id,name,kind,jurisdiction,revision,
          archived_at,created_at,updated_at
        from forums where firm_id=${firm.id}
          and ${query.status === 'archived' ? tx`archived_at is not null` : tx`archived_at is null`}
          ${query.jurisdiction ? tx`and jurisdiction=${query.jurisdiction}` : tx``}
          ${query.afterId ? tx`and (lower(name),id) > (lower(${query.afterName!}),${query.afterId}::uuid)` : tx``}
        order by lower(name),id limit 21`;
      const items = rows.slice(0, 20).map(view);
      const last = items.at(-1);
      return forumListSchema.parse({
        items,
        nextCursor: rows.length > 20 ? { afterName: last!.name, afterId: last!.id } : null,
        canCreate: canCreateForums(firm.role),
        canManage: canManageForums(firm.role),
      });
    });
  }
  async create(actor: AuthClaims, input: CreateForum, key: string, requestId: string) {
    const hash = hashOf(input);
    const result = await this.database.sql
      .begin(async (tx) => {
        const firm = await this.scope(tx, actor, true);
        if (!canCreateForums(firm.role)) throw denied('Your staff role cannot add forums.');
        const replay = await this.receipt(tx, firm.id, actor, commands.create, key, hash);
        if (replay)
          return {
            value: forumResultSchema.parse({
              forum: view(await this.forum(tx, firm.id, replay.forum.id)),
              commandId: replay.commandId,
            }),
            replayed: true,
          };
        const commandId = randomUUID();
        const [inserted] = await tx<
          { id: string }[]
        >`insert into forums(firm_id,name,kind,jurisdiction,created_by)
          values (${firm.id},${input.name},${input.kind},${input.jurisdiction},${actor.sub}) returning id`;
        const value = forumResultSchema.parse({
          forum: view(await this.forum(tx, firm.id, inserted!.id)),
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
            kind: input.kind,
            jurisdiction: input.jurisdiction,
            archived: false,
            revision: 1,
          },
        );
        return { value, replayed: false };
      })
      .catch(nameTaken);
    this.completed(commands.create, result, requestId);
    return result.value;
  }
  async update(
    actor: AuthClaims,
    forumId: string,
    input: UpdateForum,
    key: string,
    requestId: string,
  ) {
    // A retry that changes the identifier's case is the same intent.
    const hash = hashOf({ forumId: forumId.toLowerCase(), ...input });
    const result = await this.database.sql
      .begin(async (tx) => {
        const firm = await this.scope(tx, actor, true);
        if (!canManageForums(firm.role))
          throw denied('Your staff role cannot rename or archive forums.');
        const current = await this.forum(tx, firm.id, forumId, true);
        const replay = await this.receipt(tx, firm.id, actor, commands.update, key, hash);
        if (replay)
          return {
            value: forumResultSchema.parse({ forum: view(current), commandId: replay.commandId }),
            replayed: true,
          };
        if (input.expectedRevision !== current.revision)
          throw new ConflictException({
            code: 'FORUM_CHANGED',
            message: 'This forum changed. Refresh before saving another change.',
          });
        const next = {
          name: input.name ?? current.name,
          archived: input.archived ?? current.archived_at !== null,
        };
        const changed = [
          next.name !== current.name && 'name',
          next.archived !== (current.archived_at !== null) && 'archived',
        ].filter((c): c is string => typeof c === 'string');
        if (!changed.length)
          throw new ConflictException({
            code: 'FORUM_UNCHANGED',
            message: 'This forum already has these details.',
          });
        const revision = current.revision + 1,
          commandId = randomUUID();
        await tx`update forums set name=${next.name},revision=${revision},
            archived_at=${next.archived ? tx`coalesce(archived_at,clock_timestamp())` : null}
          where firm_id=${firm.id} and id=${forumId}`;
        const value = forumResultSchema.parse({
          forum: view(await this.forum(tx, firm.id, forumId)),
          commandId,
        });
        await this.record(
          tx,
          firm.id,
          actor,
          commands.update,
          key,
          requestId,
          hash,
          value,
          {
            name: current.name,
            archived: current.archived_at !== null,
            revision: current.revision,
          },
          { name: next.name, archived: next.archived, revision, changed },
        );
        return { value, replayed: false };
      })
      .catch(nameTaken);
    this.completed(commands.update, result, requestId);
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
        message: 'This action key was used for another forum change.',
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
    value: { forum: { id: string }; commandId: string },
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
      values (${value.commandId},${firmId},${actor.sub},${command},${key},${requestId},${hash},${tx.json({ forum: { id: value.forum.id }, commandId: value.commandId })})`;
    await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
      values (${firmId},${actor.sub},${value.commandId},${requestId},${command},'forum',${value.forum.id},
      ${tx.json(before as never)},${tx.json(after as never)})`;
  }
  private completed(
    command: string,
    result: { value: { commandId: string; forum: { firmId: string } }; replayed: boolean },
    requestId: string,
  ) {
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: result.value.commandId,
      firmId: result.value.forum.firmId,
      requestId,
      replayed: result.replayed,
    });
  }
}
