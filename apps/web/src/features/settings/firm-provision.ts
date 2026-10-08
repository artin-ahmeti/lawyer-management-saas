import type { createApiClient } from '@lawfirm/api-client';
import { provisionFirmSchema, provisionFirmResultSchema, type ProvisionFirm } from '@lawfirm/core';
import type { Session } from '@supabase/supabase-js';
import { firmSessionKey } from '@/lib/firm-session';

export type FirmProvisionIntent = {
  input: ProvisionFirm;
  idempotencyKey: string;
  requestId: string;
};
export function prepareFirmProvision(name: string): FirmProvisionIntent {
  return {
    input: provisionFirmSchema.parse({ name }),
    idempotencyKey: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
  };
}
export async function submitFirmProvision(
  client: Pick<ReturnType<typeof createApiClient>, 'provisionFirm'>,
  intent: FirmProvisionIntent,
  signal?: AbortSignal,
) {
  return provisionFirmResultSchema.parse(
    await client.provisionFirm(intent.input, { ...intent, signal }),
  );
}
type RefreshSession = {
  refreshSession: () => Promise<{
    data: { session: Pick<Session, 'user' | 'access_token'> | null };
    error: unknown;
  }>;
};
export async function refreshFirmSession(
  auth: RefreshSession,
  userId: string,
  expectedFirmId?: string,
) {
  // Refresh through Auth; never install an owner claim from a creation receipt.
  // https://supabase.com/docs/reference/javascript/auth-refreshsession
  const { data, error } = await auth.refreshSession();
  if (error || !data.session || data.session.user.id !== userId)
    throw new Error('Session refresh unavailable');
  // This checks cache context only. The following server read still authorizes firm access.
  const context = firmSessionKey(data.session);
  if (expectedFirmId ? context !== `${userId}:${expectedFirmId}` : context === `${userId}:none`)
    throw new Error('Firm context unavailable');
}
