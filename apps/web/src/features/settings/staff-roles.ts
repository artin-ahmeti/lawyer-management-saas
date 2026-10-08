import type { createApiClient } from '@lawfirm/api-client';
import {
  changeStaffRoleSchema,
  changeStaffRoleResultSchema,
  staffRoleHistorySchema,
  firmStaffListSchema,
  type ChangeStaffRole,
} from '@lawfirm/core';
type Client = ReturnType<typeof createApiClient>;
const checkScope = (value: { firmId: string }, firmId: string) => {
  if (value.firmId !== firmId) throw new Error('Unexpected staff scope');
};
export async function loadFirmStaff(
  client: Pick<Client, 'firmStaff'>,
  firmId: string,
  signal?: AbortSignal,
  afterId?: string,
) {
  const value = firmStaffListSchema.parse(await client.firmStaff(signal, afterId));
  checkScope(value, firmId);
  return value;
}
export async function loadStaffRoleHistory(
  client: Pick<Client, 'staffRoleHistory'>,
  firmId: string,
  signal?: AbortSignal,
  cursor: { beforeId: string; beforeCreatedAt: string } | null = null,
) {
  const value = staffRoleHistorySchema.parse(await client.staffRoleHistory(signal, cursor));
  checkScope(value, firmId);
  return value;
}
export function prepareStaffRoleChange(input: ChangeStaffRole) {
  return {
    input: changeStaffRoleSchema.parse(input),
    idempotencyKey: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
  };
}
export type StaffRoleIntent = ReturnType<typeof prepareStaffRoleChange>;
export async function submitStaffRoleChange(
  client: Pick<Client, 'changeStaffRole'>,
  firmId: string,
  intent: StaffRoleIntent,
  signal?: AbortSignal,
) {
  const value = changeStaffRoleResultSchema.parse(
    await client.changeStaffRole(intent.input, {
      idempotencyKey: intent.idempotencyKey,
      requestId: intent.requestId,
      signal,
    }),
  );
  if (
    value.firmId !== firmId ||
    value.userId !== intent.input.userId ||
    value.role !== intent.input.role ||
    value.revision !== intent.input.expectedRevision + 1
  )
    throw new Error('Unexpected staff receipt');
  return value;
}
