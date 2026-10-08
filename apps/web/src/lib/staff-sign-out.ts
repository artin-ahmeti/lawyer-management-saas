import type { QueryClient } from '@tanstack/react-query';

type SessionExitAuth = {
  signOut: (options: { scope: 'local' }) => Promise<{ error: Error | null }>;
  getSession: () => Promise<{ data: { session: object | null }; error: Error | null }>;
};

/** Local session absence and remote refresh-token revocation are distinct outcomes. */
export async function signOutStaffSession(
  auth: SessionExitAuth,
  cache: QueryClient,
  clearOverlays: () => void,
) {
  let authSignOutAccepted = false;
  try {
    const { error } = await auth.signOut({ scope: 'local' });
    authSignOutAccepted = !error;
  } catch {
    // A lost response may have cleared the local session; inspect it before claiming an outcome.
  }
  const { data, error } = await auth.getSession();
  if (error) throw new Error('Sign out could not be confirmed. Try again.');
  if (data.session) throw new Error('Could not sign out. Try again.');
  await cache.cancelQueries();
  cache.clear();
  clearOverlays();
  return { authSignOutAccepted };
}
