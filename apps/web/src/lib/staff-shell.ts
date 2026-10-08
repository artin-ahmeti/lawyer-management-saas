'use client';
import { ApiError, createApiClient } from '@lawfirm/api-client';
import { firmProfileSchema, type FirmRole } from '@lawfirm/core';
import type { Session } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { loadStaffContext } from '@/features/settings/staff-access';
import { decodedStaffSessionScope, staffSessionBoundaryKey } from './firm-session';
import { apiUrl, previewMode } from './env';
import { getSupabaseBrowser } from './supabase/client';

export const StaffIdentitySessionContext = createContext<Session | null>(null);
export async function loadStaffShell(
  client: Pick<ReturnType<typeof createApiClient>, 'staffContext' | 'firm'>,
  userId: string,
  firmId: string,
  signal?: AbortSignal,
) {
  try {
    const context = await loadStaffContext(client, userId, firmId, signal);
    if (context.kind === 'denied') return context;
    const firm = firmProfileSchema.parse(await client.firm(signal));
    if (firm.id !== firmId) throw new Error('Unexpected staff workspace');
    return { kind: 'available' as const, firm, context: context.context };
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status))
      return { kind: 'denied' as const };
    throw error;
  }
}
const roleLabels: Record<FirmRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  attorney: 'Attorney',
  paralegal: 'Paralegal',
  billing: 'Billing staff',
  readonly: 'Read-only staff',
};
export function useStaffShell() {
  const session = useContext(StaffIdentitySessionContext),
    auth = getSupabaseBrowser();
  const key = session ? staffSessionBoundaryKey(session) : 'none',
    scope = session && decodedStaffSessionScope(session);
  const client = createApiClient({
    baseUrl: apiUrl,
    accessToken: async () => {
      if (!auth) return null;
      const { data, error } = await auth.auth.getSession();
      return !error && data.session && staffSessionBoundaryKey(data.session) === key
        ? data.session.access_token
        : null;
    },
  });
  const query = useQuery({
    queryKey: ['server-firm', key, 'shell'],
    enabled: !previewMode && !!session && !!scope?.firmId,
    queryFn: ({ signal }) => loadStaffShell(client, session!.user.id, scope!.firmId!, signal),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    refetchOnWindowFocus: 'always',
  });
  const verified =
    !query.isFetching && !query.isError && query.data?.kind === 'available'
      ? query.data
      : undefined;
  const email = verified?.context.email;
  return {
    firmName:
      verified?.firm.name ??
      (!scope?.firmId
        ? 'No active workspace'
        : query.isError || query.data?.kind === 'denied'
          ? 'Workspace unavailable'
          : 'Checking workspace…'),
    userName: email ?? 'Staff account',
    initials: email?.slice(0, 2).toUpperCase() ?? '?',
    roleLabel: verified ? roleLabels[verified.context.role] : 'Access unconfirmed',
  };
}
