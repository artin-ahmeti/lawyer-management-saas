import { ConflictException } from '@nestjs/common';
import type { FirmRole } from '@lawfirm/core';
import type postgres from 'postgres';

// Shared by role changes and membership removal so both protect the same invariants.
export const canManageMatter = (role: FirmRole) => ['owner', 'admin', 'attorney'].includes(role);
export const conflict = (code: string, message: string) => new ConflictException({ code, message });

/** Holds another available owner with shared locks, or refuses to leave the firm ownerless. */
export async function requireOtherOwner(
  tx: postgres.TransactionSql,
  firmId: string,
  userId: string,
  message: string,
) {
  const [other] = await tx`select fm.id from firm_members fm join auth.users u on u.id=fm.user_id
    where fm.firm_id=${firmId} and fm.user_id<>${userId} and fm.role='owner' and fm.deleted_at is null
    and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp())
    order by fm.user_id limit 1 for share of fm,u`;
  if (!other) throw conflict('LAST_FIRM_OWNER', message);
}

/**
 * Refuses when the user is the last eligible manager of any matter, without naming or counting it.
 * An unavailable user is not an eligible manager, so removing them never lowers that count.
 */
export async function requireMatterHandoff(
  tx: postgres.TransactionSql,
  firmId: string,
  userId: string,
  message: string,
) {
  const [stranded] =
    await tx`select 1 from matter_access a join matters m on m.firm_id=a.firm_id and m.id=a.matter_id
    join auth.users tu on tu.id=a.user_id
    where a.firm_id=${firmId} and a.user_id=${userId} and a.role='manager' and a.deleted_at is null and m.deleted_at is null
    and tu.deleted_at is null and tu.email_confirmed_at is not null and (tu.banned_until is null or tu.banned_until <= clock_timestamp())
    and not exists(select 1 from matter_access b join firm_members fm on fm.firm_id=b.firm_id and fm.user_id=b.user_id
      join auth.users u on u.id=b.user_id where b.firm_id=a.firm_id and b.matter_id=a.matter_id and b.user_id<>a.user_id
      and b.role='manager' and b.deleted_at is null and fm.deleted_at is null and fm.role in ('owner','admin','attorney')
      and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until <= clock_timestamp()) limit 1 for share of fm,u) limit 1`;
  // Firm administration confers no right to names, IDs or counts of restricted matters.
  if (stranded) throw conflict('MATTER_HANDOFF_REQUIRED', message);
}
