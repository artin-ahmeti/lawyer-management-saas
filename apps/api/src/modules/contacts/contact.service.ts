import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  contactDetailSchema,
  contactListSchema,
  contactMatterListSchema,
  contactResultSchema,
  contactSchema,
  type ContactListQuery,
  type CreateContact,
  type FirmRole,
  type UpdateContact,
  uuidSchema,
} from '@lawfirm/core';
import type postgres from 'postgres';
import { z } from 'zod';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import { StaffAccessService } from '../../common/auth/staff-access.service';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';

const commands = { create: 'contact.create.v1', update: 'contact.update.v1' } as const;
/** Initial directory capability (D021); billing/readonly staff read the directory only. */
export const canEditContacts = (role: FirmRole) =>
  ['owner', 'admin', 'attorney', 'paralegal'].includes(role);
type ContactRow = {
  id: string;
  firm_id: string;
  kind: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  revision: number;
  created_at: Date;
  updated_at: Date;
};
const columns = (tx: postgres.TransactionSql) =>
  tx`id,firm_id,kind,display_name,email,phone,revision,created_at,updated_at`;
const view = (r: ContactRow) =>
  contactSchema.parse({
    id: r.id,
    firmId: r.firm_id,
    kind: r.kind,
    displayName: r.display_name,
    email: r.email,
    phone: r.phone,
    revision: r.revision,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  });
/** Receipts keep identifiers only: replays re-read the record, so details never persist here. */
const receiptSchema = z.object({ contact: z.object({ id: uuidSchema }), commandId: uuidSchema });
const unavailable = () =>
  new NotFoundException({ code: 'CONTACT_UNAVAILABLE', message: 'This contact is unavailable.' });
const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Search is a literal substring: LIKE wildcards typed by staff never widen the match. */
const literal = (q: string) => `%${q.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;

@Injectable()
export class ContactService {
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
    if (write && !canEditContacts(firm.role))
      throw new ForbiddenException({
        code: 'CAPABILITY_DENIED',
        message: 'Your staff role cannot change contacts.',
      });
    return firm;
  }
  private async contact(
    tx: postgres.TransactionSql,
    firmId: string,
    contactId: string,
    lock: 'share' | 'update' | 'none' = 'share',
  ) {
    const [row] = await tx<ContactRow[]>`select ${columns(tx)} from contacts
      where firm_id=${firmId} and id=${contactId} and deleted_at is null
      ${lock === 'update' ? tx`for update` : lock === 'share' ? tx`for share` : tx``}`;
    if (!row) throw unavailable();
    return row;
  }
  async list(actor: AuthClaims, query: ContactListQuery) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.scope(tx, actor);
      const rows = await tx<ContactRow[]>`select ${columns(tx)} from contacts
        where firm_id=${firm.id} and deleted_at is null
        ${query.q ? tx`and lower(display_name) like ${literal(query.q)} escape '\\'` : tx``}
        ${query.afterId ? tx`and (lower(display_name),id) > (lower(${query.afterName!}),${query.afterId}::uuid)` : tx``}
        order by lower(display_name),id limit 21`;
      const items = rows.slice(0, 20).map(view),
        last = items.at(-1);
      return contactListSchema.parse({
        items,
        nextCursor: rows.length > 20 ? { afterName: last!.displayName, afterId: last!.id } : null,
        canEdit: canEditContacts(firm.role),
      });
    });
  }
  async read(actor: AuthClaims, contactId: string) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.scope(tx, actor);
      return contactDetailSchema.parse({
        contact: view(await this.contact(tx, firm.id, contactId)),
        canEdit: canEditContacts(firm.role),
      });
    });
  }
  /** Only links on matters the reader holds a current grant for; nothing is counted. */
  async matters(actor: AuthClaims, contactId: string, afterId?: string) {
    return this.database.sql.begin(async (tx) => {
      const firm = await this.scope(tx, actor);
      // Existence only: matter and grant rows lock first, keeping the D021 order.
      await this.contact(tx, firm.id, contactId, 'none');
      const rows =
        await tx`select p.id as "partyId", m.id as "matterId", m.title, m.reference, p.role, p.label
        from matter_parties p join matters m on m.firm_id=p.firm_id and m.id=p.matter_id
        join matter_access a on a.firm_id=m.firm_id and a.matter_id=m.id
        where p.firm_id=${firm.id} and p.contact_id=${contactId} and p.deleted_at is null and m.deleted_at is null
          and a.user_id=${actor.sub} and a.deleted_at is null
        ${afterId ? tx`and p.id > ${afterId}::uuid` : tx``} order by p.id limit 21 for share of m,a`;
      const items = rows.slice(0, 20);
      return contactMatterListSchema.parse({
        contactId,
        items,
        nextCursor: rows.length > 20 ? items.at(-1)!.partyId : null,
      });
    });
  }
  async create(actor: AuthClaims, input: CreateContact, key: string, requestId: string) {
    const hash = hashOf(input);
    const result = await this.database.sql.begin(async (tx) => {
      const firm = await this.scope(tx, actor, true);
      const replay = await this.receipt(tx, firm.id, actor, commands.create, key, hash);
      if (replay)
        return {
          value: contactResultSchema.parse({
            contact: view(await this.contact(tx, firm.id, replay.contact.id)),
            commandId: replay.commandId,
          }),
          replayed: true,
        };
      const commandId = randomUUID();
      const [row] = await tx<
        ContactRow[]
      >`insert into contacts(firm_id,kind,display_name,email,phone,created_by)
        values (${firm.id},${input.kind},${input.displayName},${input.email ?? null},${input.phone ?? null},${actor.sub})
        returning ${columns(tx)}`;
      const value = contactResultSchema.parse({ contact: view(row!), commandId });
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
          kind: input.kind,
          displayName: input.displayName,
          hasEmail: input.email !== undefined,
          hasPhone: input.phone !== undefined,
          revision: 1,
        },
      );
      return { value, replayed: false };
    });
    this.completed(commands.create, result, requestId);
    return result.value;
  }
  async update(
    actor: AuthClaims,
    contactId: string,
    input: UpdateContact,
    key: string,
    requestId: string,
  ) {
    const hash = hashOf({ contactId, ...input });
    const result = await this.database.sql.begin(async (tx) => {
      const firm = await this.scope(tx, actor, true);
      const current = await this.contact(tx, firm.id, contactId, 'update');
      const replay = await this.receipt(tx, firm.id, actor, commands.update, key, hash);
      if (replay)
        return {
          value: contactResultSchema.parse({ contact: view(current), commandId: replay.commandId }),
          replayed: true,
        };
      if (input.expectedRevision !== current.revision)
        throw new ConflictException({
          code: 'CONTACT_CHANGED',
          message: 'This contact changed. Refresh before saving another change.',
        });
      const next = {
        display_name: input.displayName ?? current.display_name,
        email: input.email === undefined ? current.email : input.email,
        phone: input.phone === undefined ? current.phone : input.phone,
      };
      const changed = [
        next.display_name !== current.display_name && 'displayName',
        next.email !== current.email && 'email',
        next.phone !== current.phone && 'phone',
      ].filter(Boolean);
      if (!changed.length)
        throw new ConflictException({
          code: 'CONTACT_UNCHANGED',
          message: 'This contact already has these details.',
        });
      const revision = current.revision + 1,
        commandId = randomUUID();
      const [row] = await tx<ContactRow[]>`update contacts set display_name=${next.display_name},
        email=${next.email},phone=${next.phone},revision=${revision}
        where firm_id=${firm.id} and id=${contactId} returning ${columns(tx)}`;
      const value = contactResultSchema.parse({ contact: view(row!), commandId });
      // Personal details stay in the protected record; the append-only audit names fields only.
      await this.record(
        tx,
        firm.id,
        actor,
        commands.update,
        key,
        requestId,
        hash,
        value,
        { contactId, displayName: current.display_name, revision: current.revision },
        { contactId, displayName: next.display_name, revision, changed },
      );
      return { value, replayed: false };
    });
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
        message: 'This action key was used for another contact change.',
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
    value: { contact: { id: string }; commandId: string },
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
      values (${value.commandId},${firmId},${actor.sub},${command},${key},${requestId},${hash},${tx.json({ contact: { id: value.contact.id }, commandId: value.commandId })})`;
    await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
      values (${firmId},${actor.sub},${value.commandId},${requestId},${command},'contact',${value.contact.id},
      ${tx.json(before as never)},${tx.json(after as never)})`;
  }
  private completed(
    command: string,
    result: { value: { commandId: string; contact: { firmId: string } }; replayed: boolean },
    requestId: string,
  ) {
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: result.value.commandId,
      firmId: result.value.contact.firmId,
      requestId,
      replayed: result.replayed,
    });
  }
}
