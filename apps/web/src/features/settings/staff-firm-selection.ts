import type { createApiClient } from '@lawfirm/api-client';
import {
  activeFirmSelectionSchema,
  firmProfileSchema,
  selectStaffFirmSchema,
  selectStaffFirmResultSchema,
  type SelectStaffFirmResult,
} from '@lawfirm/core';
import type { Session } from '@supabase/supabase-js';
import { decodedStaffSessionScope } from '@/lib/firm-session';

export function prepareStaffFirmSelection(firmId: string, expectedRevision: number) {
  return {
    input: selectStaffFirmSchema.parse({ firmId, expectedRevision }),
    idempotencyKey: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
  };
}
export type StaffFirmSelectionIntent = ReturnType<typeof prepareStaffFirmSelection>;
export async function loadActiveFirmSelection(
  client: Pick<ReturnType<typeof createApiClient>, 'activeFirmSelection'>,
  userId: string,
  signal?: AbortSignal,
) {
  const value = activeFirmSelectionSchema.parse(await client.activeFirmSelection(signal));
  if (value.userId !== userId) throw new Error('Unexpected workspace selection');
  return value;
}
export async function submitStaffFirmSelection(
  client: Pick<ReturnType<typeof createApiClient>, 'selectStaffFirm'>,
  intent: StaffFirmSelectionIntent,
  userId: string,
  signal?: AbortSignal,
) {
  const value = selectStaffFirmResultSchema.parse(
    await client.selectStaffFirm(intent.input, { ...intent, signal }),
  );
  if (
    value.userId !== userId ||
    value.firmId !== intent.input.firmId ||
    value.revision !== intent.input.expectedRevision + 1
  )
    throw new Error('Unexpected workspace selection');
  return value;
}
export async function verifyRefreshedStaffSelection(
  refreshed: { data: { session: Pick<Session, 'user' | 'access_token'> | null }; error: unknown },
  receipt: SelectStaffFirmResult,
  sessionId: string,
  readFirm: () => Promise<unknown>,
) {
  const session = refreshed.data.session;
  if (refreshed.error || !session || session.user.id !== receipt.userId)
    throw new Error('Workspace session could not be refreshed');
  const scope = decodedStaffSessionScope(session);
  if (
    scope?.sessionId !== sessionId ||
    scope.firmId !== receipt.firmId ||
    scope.revision !== receipt.revision
  )
    throw new Error('Workspace session changed');
  // A refreshed claim is only a namespace; this server read authorizes the target and current role.
  const firm = firmProfileSchema.parse(await readFirm());
  if (firm.id !== receipt.firmId) throw new Error('Unexpected workspace');
  return firm;
}
