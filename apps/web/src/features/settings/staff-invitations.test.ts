import { expect, it, vi } from 'vitest';
import { ApiError } from '@lawfirm/api-client';
import { loadInvitations, submitInvitation } from './staff-invitations';
const id = '00000000-0000-4000-a000-000000000001';
it('hides warm invitation identities after denial and rejects a response for another account or firm', async () => {
  const client = {
    receivedInvitations: vi.fn().mockResolvedValue({ userId: id, items: [], nextCursor: null }),
    staffInvitations: vi.fn(),
  };
  expect(await loadInvitations(client, { kind: 'received', userId: id }, null)).toMatchObject({
    kind: 'available',
  });
  client.receivedInvitations.mockRejectedValueOnce(
    new ApiError(403, 'ACCOUNT_UNAVAILABLE', 'Denied'),
  );
  expect(await loadInvitations(client, { kind: 'received', userId: id }, null)).toEqual({
    kind: 'denied',
  });
  client.receivedInvitations.mockResolvedValue({
    userId: '00000000-0000-4000-a000-000000000002',
    items: [],
    nextCursor: null,
  });
  await expect(loadInvitations(client, { kind: 'received', userId: id }, null)).rejects.toThrow();
  client.staffInvitations.mockResolvedValue({
    firmId: '00000000-0000-4000-a000-000000000002',
    items: [],
    nextCursor: null,
  });
  await expect(loadInvitations(client, { kind: 'managed', firmId: id }, null)).rejects.toThrow();
});
it('reuses an uncertain command intent and refuses a receipt for a different reviewed invitation', async () => {
  const receipt = {
    firmId: id,
    invitationId: id,
    commandId: id,
    status: 'accepted',
    revision: 2,
    delivery: 'unavailable',
    requiresSessionRefresh: true,
  };
  const client = {
    acceptStaffInvitation: vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Lost response'))
      .mockResolvedValue(receipt),
    revokeStaffInvitation: vi.fn(),
    prepareStaffInvitation: vi.fn(),
  };
  const intent = {
    firmId: id,
    kind: 'accept' as const,
    invitationId: id,
    input: { expectedRevision: 1 },
    idempotencyKey: id,
    requestId: id,
  };
  await expect(submitInvitation(client, intent)).rejects.toThrow('Lost response');
  expect(await submitInvitation(client, intent)).toEqual(receipt);
  expect(client.acceptStaffInvitation.mock.calls[0]).toEqual(
    client.acceptStaffInvitation.mock.calls[1],
  );
  client.acceptStaffInvitation.mockResolvedValue({
    ...receipt,
    invitationId: '00000000-0000-4000-a000-000000000002',
  });
  await expect(submitInvitation(client, intent)).rejects.toThrow();
});
