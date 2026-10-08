import { ApiError, type createApiClient } from '@lawfirm/api-client';
import {
  receivedInvitationListSchema,
  staffInvitationListSchema,
  staffInvitationCommandResultSchema,
  type CreateStaffInvitation,
  type InvitationRevision,
} from '@lawfirm/core';
type Client = ReturnType<typeof createApiClient>;
export type InvitationIntent = { idempotencyKey: string; requestId: string; firmId: string } & (
  | { kind: 'prepare'; input: CreateStaffInvitation }
  | { kind: 'accept' | 'revoke'; invitationId: string; input: InvitationRevision }
);
export async function loadInvitations(
  client: Pick<Client, 'receivedInvitations' | 'staffInvitations'>,
  scope: { kind: 'received'; userId: string } | { kind: 'managed'; firmId: string },
  cursor: { beforeId: string; beforeCreatedAt: string } | null,
  signal?: AbortSignal,
) {
  try {
    if (scope.kind === 'received') {
      const page = receivedInvitationListSchema.parse(
        await client.receivedInvitations(cursor, signal),
      );
      if (page.userId !== scope.userId) throw new Error('Invitation account mismatch');
      return { kind: 'available' as const, page };
    }
    const page = staffInvitationListSchema.parse(await client.staffInvitations(cursor, signal));
    if (page.firmId !== scope.firmId || page.items.some((item) => item.firmId !== scope.firmId))
      throw new Error('Invitation firm mismatch');
    return { kind: 'available' as const, page };
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status))
      return { kind: 'denied' as const };
    throw error;
  }
}
export async function submitInvitation(
  client: Pick<
    Client,
    'acceptStaffInvitation' | 'revokeStaffInvitation' | 'prepareStaffInvitation'
  >,
  intent: InvitationIntent,
  signal?: AbortSignal,
) {
  const action = { idempotencyKey: intent.idempotencyKey, requestId: intent.requestId, signal };
  const value =
    intent.kind === 'prepare'
      ? await client.prepareStaffInvitation(intent.input, action)
      : intent.kind === 'accept'
        ? await client.acceptStaffInvitation(intent.invitationId, intent.input, action)
        : await client.revokeStaffInvitation(intent.invitationId, intent.input, action);
  const receipt = staffInvitationCommandResultSchema.parse(value);
  const expectedStatus =
    intent.kind === 'prepare' ? 'pending' : intent.kind === 'accept' ? 'accepted' : 'revoked';
  if (
    receipt.firmId !== intent.firmId ||
    receipt.status !== expectedStatus ||
    (intent.kind !== 'prepare' && receipt.invitationId !== intent.invitationId)
  )
    throw new Error('Invitation receipt mismatch');
  return receipt;
}
