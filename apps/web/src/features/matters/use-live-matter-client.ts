'use client';
import { createApiClient } from '@lawfirm/api-client';
import { useContext } from 'react';
import { StaffIdentitySessionContext } from '@/lib/staff-shell';
import { decodedStaffSessionScope, staffSessionBoundaryKey } from '@/lib/firm-session';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { apiUrl } from '@/lib/env';

export function useLiveMatterClient() {
  const session = useContext(StaffIdentitySessionContext),
    auth = getSupabaseBrowser();
  const context = session ? staffSessionBoundaryKey(session) : 'none';
  const scope = session && decodedStaffSessionScope(session);
  const client = createApiClient({
    baseUrl: apiUrl,
    accessToken: async () => {
      if (!auth) return null;
      const { data, error } = await auth.auth.getSession();
      return !error && data.session && staffSessionBoundaryKey(data.session) === context
        ? data.session.access_token
        : null;
    },
  });
  return { client, context, firmId: scope?.firmId };
}
