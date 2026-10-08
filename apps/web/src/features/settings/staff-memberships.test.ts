import { createApiClient } from '@lawfirm/api-client';
import { expect, it, vi } from 'vitest';
import { loadStaffMemberships } from './staff-memberships';

const userId = '00000000-0000-4000-a000-000000000001';
const firmId = '00000000-0000-4000-a000-000000000002';
const id = '00000000-0000-4000-a000-000000000003';
const page = {
  userId,
  items: [{ id, firmId, firmName: 'Current firm', role: 'readonly' }],
  nextCursor: null,
};
const client = (fetcher: typeof fetch) =>
  createApiClient({
    baseUrl: 'http://localhost:3300',
    accessToken: async () => 'test',
    fetch: fetcher,
  });

it('uses a bounded cancellable authenticated read with the retained cursor', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(page)));
  const signal = new AbortController().signal;
  expect(await loadStaffMemberships(client(fetcher), userId, id, signal)).toEqual({
    kind: 'available',
    page,
  });
  expect(fetcher.mock.calls[0]?.[0]).toBe(`http://localhost:3300/auth/memberships?afterId=${id}`);
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
    signal,
    cache: 'no-store',
    headers: { Authorization: 'Bearer test' },
  });
});
it('rejects foreign identity, unsupported roles/authority, duplicate firms and invalid pagination', async () => {
  for (const bad of [
    { ...page, userId: firmId },
    { ...page, items: [{ ...page.items[0], role: 'superadmin' }] },
    { ...page, activeFirmId: firmId },
    { ...page, items: [page.items[0], { ...page.items[0], id: firmId }] },
    { ...page, items: Array.from({ length: 21 }, () => page.items[0]) },
    { ...page, nextCursor: { afterId: userId } },
  ])
    await expect(
      loadStaffMemberships(
        client(vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(bad)))),
        userId,
      ),
    ).rejects.toThrow();
});
it('returns denial instead of warm membership details and leaves transport failures visible', async () => {
  for (const status of [401, 403])
    expect(
      await loadStaffMemberships(
        client(vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status }))),
        userId,
      ),
    ).toEqual({ kind: 'denied' });
  await expect(
    loadStaffMemberships(
      client(vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Offline'))),
      userId,
    ),
  ).rejects.toThrow('Offline');
});
