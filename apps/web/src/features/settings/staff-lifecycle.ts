import type { createApiClient } from '@lawfirm/api-client';
import {
  removedStaffListSchema,
  removeStaffMembershipSchema,
  restoreStaffMembershipSchema,
  staffMembershipHistorySchema,
  staffMembershipResultSchema,
  type RemoveStaffMembership,
  type RestoreStaffMembership,
} from '@lawfirm/core';
type Client = ReturnType<typeof createApiClient>;
const checkScope = (value: { firmId: string }, firmId: string) => {
  if (value.firmId !== firmId) throw new Error('Unexpected staff scope');
};
export async function loadRemovedStaff(
  client: Pick<Client, 'removedStaff'>,
  firmId: string,
  signal?: AbortSignal,
  afterId?: string,
) {
  const value = removedStaffListSchema.parse(await client.removedStaff(signal, afterId));
  checkScope(value, firmId);
  return value;
}
export async function loadStaffMembershipHistory(
  client: Pick<Client, 'staffMembershipHistory'>,
  firmId: string,
  signal?: AbortSignal,
  cursor: { beforeId: string; beforeCreatedAt: string } | null = null,
) {
  const value = staffMembershipHistorySchema.parse(
    await client.staffMembershipHistory(signal, cursor),
  );
  checkScope(value, firmId);
  return value;
}
export type StaffMembershipChange =
  | { action: 'remove'; input: RemoveStaffMembership }
  | { action: 'restore'; input: RestoreStaffMembership };
export function prepareStaffMembershipChange(change: StaffMembershipChange) {
  return {
    change:
      change.action === 'remove'
        ? { action: change.action, input: removeStaffMembershipSchema.parse(change.input) }
        : { action: change.action, input: restoreStaffMembershipSchema.parse(change.input) },
    idempotencyKey: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
  };
}
export type StaffMembershipIntent = ReturnType<typeof prepareStaffMembershipChange>;
export async function submitStaffMembershipChange(
  client: Pick<Client, 'removeStaffMembership' | 'restoreStaffMembership'>,
  firmId: string,
  intent: StaffMembershipIntent,
  signal?: AbortSignal,
) {
  const { change } = intent,
    action = { idempotencyKey: intent.idempotencyKey, requestId: intent.requestId, signal };
  const value = staffMembershipResultSchema.parse(
    change.action === 'remove'
      ? await client.removeStaffMembership(change.input, action)
      : await client.restoreStaffMembership(change.input, action),
  );
  if (
    value.firmId !== firmId ||
    value.userId !== change.input.userId ||
    value.revision !== change.input.expectedRevision + 1 ||
    value.status !== (change.action === 'remove' ? 'removed' : 'active') ||
    (change.action === 'restore' && value.role !== change.input.role)
  )
    throw new Error('Unexpected staff receipt');
  return value;
}
