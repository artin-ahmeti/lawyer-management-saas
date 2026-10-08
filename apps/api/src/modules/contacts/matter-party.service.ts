import { createHash, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  matterPartyListSchema,
  matterPartyResultSchema,
  matterPartySchema,
  type AddMatterParty,
  type EndMatterParty,
  type FirmRole,
} from '@lawfirm/core';
import type postgres from 'postgres';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';
import { StaffAccessService } from '../../common/auth/staff-access.service';
import { DatabaseService } from '../../common/database/database.module';
import { log } from '../../common/http';

const commands = { add: 'matter.party.add.v1', end: 'matter.party.end.v1' } as const;
const canManage = (role: FirmRole) => ['owner', 'admin', 'attorney'].includes(role);
type PartyRow = {
  id: string;
  firm_id: string;
  matter_id: string;
  contact_id: string;
  kind: string;
  display_name: string;
  role: string;
  label: string | null;
  created_at: Date;
  deleted_at: Date | null;
};
const view = (r: PartyRow) =>
  matterPartySchema.parse({
    id: r.id,
    firmId: r.firm_id,
    matterId: r.matter_id,
    contactId: r.contact_id,
    contact: { kind: r.kind, displayName: r.display_name },
    role: r.role,
    label: r.label,
    createdAt: r.created_at.toISOString(),
    endedAt: r.deleted_at?.toISOString() ?? null,
  });
const conflict = (code: string, message: string) => new ConflictException({ code, message });
const matterUnavailable = () =>
  new NotFoundException({ code: 'MATTER_UNAVAILABLE', message: 'This matter is unavailable.' });
const partyUnavailable = () =>
  new NotFoundException({ code: 'PARTY_UNAVAILABLE', message: 'This party is unavailable.' });

@Injectable()
export class MatterPartyService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(StaffAccessService) private readonly access: StaffAccessService,
  ) {}
  /** Lock order: account → firm membership → matter → grant → contact/party (D018–D021). */
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
    const [grant] = await tx`select a.role from matters m join matter_access a
      on a.firm_id=m.firm_id and a.matter_id=m.id
      where m.firm_id=${firm.id} and m.id=${matterId} and m.deleted_at is null
        and a.user_id=${actor.sub} and a.deleted_at is null for share of m,a`;
    if (!grant) throw matterUnavailable();
    const manages = grant.role === 'manager' && canManage(firm.role);
    if (write && !manages)
      throw new ForbiddenException({
        code: 'MATTER_PARTY_MANAGEMENT_DENIED',
        message: 'Your current role and matter grant do not allow changing parties.',
      });
    return { firmId: firm.id, canManage: manages };
  }
  private async party(tx: postgres.TransactionSql, firmId: string, matterId: string, id: string) {
    const [row] = await tx<
      PartyRow[]
    >`select p.id,p.firm_id,p.matter_id,p.contact_id,c.kind,c.display_name,
      p.role,p.label,p.created_at,p.deleted_at
      from matter_parties p join contacts c on c.firm_id=p.firm_id and c.id=p.contact_id
      where p.firm_id=${firmId} and p.matter_id=${matterId} and p.id=${id} for update of p`;
    return row;
  }
  async list(actor: AuthClaims, matterId: string, afterId?: string) {
    return this.database.sql.begin(async (tx) => {
      const scope = await this.scope(tx, actor, matterId);
      const rows = await tx<
        PartyRow[]
      >`select p.id,p.firm_id,p.matter_id,p.contact_id,c.kind,c.display_name,
        p.role,p.label,p.created_at,p.deleted_at
        from matter_parties p join contacts c on c.firm_id=p.firm_id and c.id=p.contact_id
        where p.firm_id=${scope.firmId} and p.matter_id=${matterId} and p.deleted_at is null
        ${afterId ? tx`and p.id > ${afterId}::uuid` : tx``} order by p.id limit 21`;
      const items = rows.slice(0, 20).map(view);
      return matterPartyListSchema.parse({
        matterId,
        items,
        nextCursor: rows.length > 20 ? items.at(-1)!.id : null,
        canManage: scope.canManage,
      });
    });
  }
  async add(
    actor: AuthClaims,
    matterId: string,
    input: AddMatterParty,
    key: string,
    requestId: string,
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ matterId, ...input }))
      .digest('hex');
    const result = await this.database.sql
      .begin(async (tx) => {
        const scope = await this.scope(tx, actor, matterId, true);
        const replay = await this.receipt(tx, scope.firmId, actor, commands.add, key, hash);
        if (replay) {
          const row = await this.party(tx, scope.firmId, matterId, replay.party.id);
          return {
            value: matterPartyResultSchema.parse({
              party: view(row!),
              commandId: replay.commandId,
            }),
            replayed: true,
          };
        }
        const [contact] = await tx`select id from contacts where firm_id=${scope.firmId}
          and id=${input.contactId} and deleted_at is null for share`;
        if (!contact)
          throw new NotFoundException({
            code: 'CONTACT_UNAVAILABLE',
            message: 'This contact is unavailable.',
          });
        const commandId = randomUUID();
        const [inserted] =
          await tx`insert into matter_parties(firm_id,matter_id,contact_id,role,label,created_by)
          values (${scope.firmId},${matterId},${input.contactId},${input.role},${input.label ?? null},${actor.sub})
          returning id`;
        const value = matterPartyResultSchema.parse({
          party: view((await this.party(tx, scope.firmId, matterId, inserted!.id))!),
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
            partyId: value.party.id,
            contactId: input.contactId,
            role: input.role,
            label: input.label ?? null,
          },
        );
        return { value, replayed: false };
      })
      .catch((error: { code?: string; constraint_name?: string }) => {
        // Another request linked the same contact first; the partial unique index decides.
        if (error.code === '23505' && error.constraint_name === 'matter_parties_current_uq')
          throw conflict('PARTY_EXISTS', 'This contact is already a party to this matter.');
        throw error;
      });
    this.completed(commands.add, result, requestId);
    return result.value;
  }
  async end(
    actor: AuthClaims,
    matterId: string,
    input: EndMatterParty,
    key: string,
    requestId: string,
  ) {
    const hash = createHash('sha256')
      .update(JSON.stringify({ matterId, ...input }))
      .digest('hex');
    const result = await this.database.sql.begin(async (tx) => {
      const scope = await this.scope(tx, actor, matterId, true);
      const current = await this.party(tx, scope.firmId, matterId, input.partyId);
      if (!current) throw partyUnavailable();
      const replay = await this.receipt(tx, scope.firmId, actor, commands.end, key, hash);
      if (replay)
        return {
          value: matterPartyResultSchema.parse({
            party: view(current),
            commandId: replay.commandId,
          }),
          replayed: true,
        };
      if (current.deleted_at) throw conflict('PARTY_ENDED', 'This party link has already ended.');
      const commandId = randomUUID();
      await tx`update matter_parties set deleted_at=clock_timestamp() where id=${current.id}`;
      const ended = (await this.party(tx, scope.firmId, matterId, current.id))!;
      const value = matterPartyResultSchema.parse({ party: view(ended), commandId });
      await this.record(
        tx,
        scope.firmId,
        actor,
        commands.end,
        key,
        requestId,
        hash,
        value,
        { partyId: current.id, contactId: current.contact_id, role: current.role, endedAt: null },
        {
          partyId: current.id,
          contactId: current.contact_id,
          role: current.role,
          endedAt: value.party.endedAt,
        },
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
      throw conflict('IDEMPOTENCY_CONFLICT', 'This action key was used for another party change.');
    return matterPartyResultSchema.parse(receipt.response);
  }
  private async record(
    tx: postgres.TransactionSql,
    firmId: string,
    actor: AuthClaims,
    command: string,
    key: string,
    requestId: string,
    hash: string,
    value: { party: { matterId: string }; commandId: string },
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    await tx`insert into command_receipts(id,firm_id,created_by,command,idempotency_key,request_id,input_hash,response)
      values (${value.commandId},${firmId},${actor.sub},${command},${key},${requestId},${hash},${tx.json(value as never)})`;
    await tx`insert into audit_logs(firm_id,created_by,command_id,request_id,action,record_type,record_id,before,after)
      values (${firmId},${actor.sub},${value.commandId},${requestId},${command},'matter',${value.party.matterId},
      ${tx.json(before as never)},${tx.json(after as never)})`;
  }
  private completed(
    command: string,
    result: { value: { commandId: string; party: { firmId: string } }; replayed: boolean },
    requestId: string,
  ) {
    log.info({
      event: 'command_completed',
      entryPoint: 'http',
      command,
      commandId: result.value.commandId,
      firmId: result.value.party.firmId,
      requestId,
      replayed: result.replayed,
    });
  }
}
