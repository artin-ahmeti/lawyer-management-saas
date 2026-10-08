import { Inject, Injectable } from '@nestjs/common';
import {
  staffMembershipListSchema,
  type StaffMembership,
  type StaffMembershipCursor,
} from '@lawfirm/core';
import { DatabaseService } from '../../common/database/database.module';
import type { AuthClaims } from '../../common/auth/auth-claims';
import { confirmedAccount } from '../../common/auth/confirmed-account';

@Injectable()
export class StaffMembershipService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async list(actor: AuthClaims, cursor: StaffMembershipCursor) {
    return this.database.sql.begin(async (tx) => {
      await tx`set local lock_timeout = '2s'`;
      await tx`set local statement_timeout = '5s'`;
      await confirmedAccount(tx, actor.sub, 'share');
      // A single statement reads a consistent membership snapshot; consuming commands revalidate.
      // This account-level read never takes its actor or firms from query/body/JWT role claims.
      const rows = await tx<
        StaffMembership[]
      >`select fm.id, fm.firm_id as "firmId", f.name as "firmName", fm.role
        from public.firm_members fm join public.firms f on f.id = fm.firm_id
        where fm.user_id = ${actor.sub} and fm.deleted_at is null and f.deleted_at is null
        ${cursor.afterId ? tx`and fm.id > ${cursor.afterId}` : tx``}
        order by fm.id limit 21`;
      const items = rows.slice(0, 20);
      return staffMembershipListSchema.parse({
        userId: actor.sub,
        items,
        nextCursor: rows.length > 20 ? { afterId: items[19]!.id } : null,
      });
    });
  }
}
