import { staffInvitationCheckEventSchema } from '@lawfirm/core';
import type postgres from 'postgres';

export type InvitationCheckResult = {
  kind: 'staff_invitation_verified';
  invitationId: string;
  revision: number;
  status: 'pending' | 'accepted' | 'revoked';
  delivery: 'unavailable';
};
type Outcome = { result: InvitationCheckResult | null; errorCode: string | null };
/** An internal source check, never email delivery or an asynchronous membership grant. */
export async function checkStaffInvitation(
  tx: postgres.TransactionSql,
  firmId: string,
  actorId: string,
  payload: unknown,
): Promise<Outcome> {
  const parsed = staffInvitationCheckEventSchema.safeParse(payload);
  if (!parsed.success || parsed.data.firmId !== firmId)
    return { result: null, errorCode: 'INVALID_EVENT' };
  const [authority] =
    await tx`select fm.role from public.firm_members fm join public.firms f on f.id=fm.firm_id join auth.users u on u.id=fm.user_id
  where fm.firm_id=${firmId} and fm.user_id=${actorId} and fm.deleted_at is null and f.deleted_at is null and u.deleted_at is null
    and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=clock_timestamp()) for share of fm,f,u`;
  if (!authority) return { result: null, errorCode: 'ACCESS_REVOKED' };
  const [invitation] = await tx<
    {
      id: string;
      revision: number;
      status: 'pending' | 'accepted' | 'revoked';
      created_by: string;
      accepted_by: string | null;
      revoked_by: string | null;
    }[]
  >`select id,revision,status,created_by,accepted_by,revoked_by from public.staff_invitations where id=${parsed.data.invitationId} and firm_id=${firmId} and deleted_at is null for share`;
  if (!invitation) return { result: null, errorCode: 'SOURCE_UNAVAILABLE' };
  if (invitation.revision !== parsed.data.revision)
    return { result: null, errorCode: 'SOURCE_CHANGED' };
  const sourceActor =
    invitation.status === 'accepted'
      ? invitation.accepted_by
      : invitation.status === 'revoked'
        ? invitation.revoked_by
        : invitation.created_by;
  if (sourceActor !== actorId) return { result: null, errorCode: 'INVALID_EVENT' };
  if (invitation.status !== 'accepted' && !['owner', 'admin'].includes(authority.role))
    return { result: null, errorCode: 'ACCESS_REVOKED' };
  return {
    errorCode: null,
    result: {
      kind: 'staff_invitation_verified',
      invitationId: invitation.id,
      revision: invitation.revision,
      status: invitation.status,
      delivery: 'unavailable',
    },
  };
}
