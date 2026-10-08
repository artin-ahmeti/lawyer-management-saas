import { ForbiddenException } from '@nestjs/common';
import { invitationEmailSchema } from '@lawfirm/core';
import type postgres from 'postgres';

/** Account-level membership commands share bootstrap's profile serialization boundary. */
export async function confirmedAccount(
  tx: postgres.Sql | postgres.TransactionSql,
  userId: string,
  lock: 'share' | 'update',
) {
  const [account] = await tx`select u.email, u.email_confirmed_at, u.deleted_at,
   u.banned_until > clock_timestamp() as is_banned
   from public.profiles p join auth.users u on u.id = p.id where p.id = ${userId}
   ${lock === 'update' ? tx`for update of p for share of u` : tx`for share of p, u`}`;
  if (!account || account.deleted_at || account.is_banned)
    throw new ForbiddenException({
      code: 'ACCOUNT_UNAVAILABLE',
      message: 'This account is unavailable.',
    });
  if (!account.email_confirmed_at)
    throw new ForbiddenException({
      code: 'EMAIL_CONFIRMATION_REQUIRED',
      message: 'Confirm your email to continue.',
    });
  const email = invitationEmailSchema.safeParse(account.email);
  if (!email.success)
    throw new ForbiddenException({
      code: 'ACCOUNT_UNAVAILABLE',
      message: 'This account is unavailable.',
    });
  return { email: email.data };
}
