import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  staffContextSchema,
  type FirmCapability,
  type FirmRole,
  type StaffContext,
} from '@lawfirm/core';
import type postgres from 'postgres';
import { DatabaseService } from '../database/database.module';
import type { AuthClaims } from './auth-claims';
import { confirmedAccount } from './confirmed-account';

export function capabilitiesForRole(role: FirmRole): FirmCapability[] {
  return [
    'firm.profile.read',
    ...(['owner', 'admin'].includes(role)
      ? ([
          'firm.profile.rename',
          'firm.processing.inspect',
          'firm.processing.request',
          'firm.staff.invitations.manage',
          'firm.staff.roles.manage',
        ] as const)
      : []),
  ];
}
export const hasFirmCapability = (role: FirmRole, capability: FirmCapability) =>
  capabilitiesForRole(role).includes(capability);
export type ActiveStaffFirm = { id: string; name: string; revision: number; role: FirmRole };

@Injectable()
export class StaffAccessService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async current(
    sql: postgres.Sql | postgres.TransactionSql,
    actor: AuthClaims,
    lock?: 'share' | 'update',
  ) {
    if (!actor.firm_id)
      throw new ForbiddenException({
        code: 'NO_ACTIVE_FIRM',
        message: 'A current firm membership is required.',
      });
    if (actor.session_id && lock) {
      // Domain transactions share selection's account boundary before taking firm locks.
      // This also protects the first selection, when no context row exists to lock yet.
      await confirmedAccount(sql, actor.sub, 'share');
      const [session] =
        await sql`select id from auth.sessions where id=${actor.session_id} and user_id=${actor.sub}
        and (not_after is null or not_after > clock_timestamp()) for share`;
      if (!session)
        throw new ForbiddenException({
          code: 'SESSION_UNAVAILABLE',
          message: 'Sign in again to continue.',
        });
    }
    if (lock) {
      // Acquire the parent before any member row. Membership commands hold it
      // exclusively; domain commands/read transactions share it.
      await sql`select id from public.firms where id=${actor.firm_id} and deleted_at is null
        ${lock === 'update' ? sql`for update` : sql`for share`}`;
    }
    const [firm] = await sql<ActiveStaffFirm[]>`select f.id, f.name, f.revision, fm.role
      from public.firms f join public.firm_members fm on fm.firm_id = f.id
      where f.id = ${actor.firm_id} and fm.user_id = ${actor.sub} and f.deleted_at is null and fm.deleted_at is null
      ${actor.session_id ? sql`and app.staff_session_authorized(${actor.session_id}::uuid,${actor.sub}::uuid,${actor.firm_id}::uuid,${actor.staff_context_revision ?? null}::integer)` : sql``}
      ${lock ? sql`for share of fm` : sql``}`;
    if (!firm)
      throw new ForbiddenException({
        code: 'FIRM_ACCESS_DENIED',
        message: 'You no longer have access to this firm.',
      });
    return firm;
  }

  async context(actor: AuthClaims): Promise<StaffContext> {
    if (!actor.firm_id)
      return staffContextSchema.parse({ userId: actor.sub, email: actor.email, capabilities: [] });
    return this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout = '2s'`;
      await tx`set local statement_timeout = '5s'`;
      const firm = await this.current(tx, actor, 'share');
      return staffContextSchema.parse({
        userId: actor.sub,
        email: actor.email,
        firmId: firm.id,
        role: firm.role,
        capabilities: capabilitiesForRole(firm.role),
      });
    });
  }
}
