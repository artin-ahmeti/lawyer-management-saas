import { QueryClient } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { signOutStaffSession } from './staff-sign-out';

it('signs out this browser session and clears retained server data before navigation', async () => {
  const cache = new QueryClient();
  cache.setQueryData(['server-firm', 'actor:firm'], { name: 'Private firm' });
  cache.setQueryData(['future-domain', 'actor:firm'], { title: 'Private work' });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const reset = vi.fn();
  await signOutStaffSession(
    { signOut, getSession: async () => ({ data: { session: null }, error: null }) },
    cache,
    reset,
  );
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(cache.getQueryCache().getAll()).toEqual([]);
  expect(reset).toHaveBeenCalledOnce();
});
it('does not report logout or clear current state when Auth fails', async () => {
  const cache = new QueryClient();
  cache.setQueryData(['server-firm'], { name: 'Retained while authenticated' });
  const reset = vi.fn();
  await expect(
    signOutStaffSession(
      {
        signOut: async () => ({ error: new Error('Private provider error') }),
        getSession: async () => ({ data: { session: { user: { id: 'retained' } } }, error: null }),
      },
      cache,
      reset,
    ),
  ).rejects.toThrow('Could not sign out. Try again.');
  expect(reset).not.toHaveBeenCalled();
  expect(cache.getQueryData(['server-firm'])).toBeDefined();
});
it('rejects an unavailable session check rather than claiming local logout', async () => {
  const cache = new QueryClient();
  const reset = vi.fn();
  await expect(
    signOutStaffSession(
      {
        signOut: async () => ({ error: null }),
        getSession: async () => ({
          data: { session: null },
          error: new Error('Session read unavailable'),
        }),
      },
      cache,
      reset,
    ),
  ).rejects.toThrow('Sign out could not be confirmed. Try again.');
  expect(reset).not.toHaveBeenCalled();
});
it('clears private caches when the SDK removes the local session despite failed remote revocation', async () => {
  const cache = new QueryClient();
  cache.setQueryData(['server-firm'], 'Private firm');
  const result = await signOutStaffSession(
    {
      signOut: async () => ({ error: new Error('Auth unavailable') }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    cache,
    () => {},
  );
  expect(result).toEqual({ authSignOutAccepted: false });
  expect(cache.getQueryCache().getAll()).toEqual([]);
});
it('rejects retained sessions even when the remote request reported success', async () => {
  await expect(
    signOutStaffSession(
      {
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: {} }, error: null }),
      },
      new QueryClient(),
      () => {},
    ),
  ).rejects.toThrow('Could not sign out. Try again.');
});
it('cancels an in-flight read so its late result cannot repopulate another account’s cache', async () => {
  const cache = new QueryClient();
  let resolveRead!: (value: string) => void;
  const read = cache.fetchQuery({
    queryKey: ['server-firm'],
    queryFn: () =>
      new Promise<string>((resolve) => {
        resolveRead = resolve;
      }),
  });
  const handledRead = read.catch(() => null);
  await signOutStaffSession(
    {
      signOut: async () => ({ error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    cache,
    () => {},
  );
  resolveRead('Private late response');
  await handledRead;
  expect(cache.getQueryCache().getAll()).toEqual([]);
});
