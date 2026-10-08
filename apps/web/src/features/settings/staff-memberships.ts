import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { staffMembershipListSchema, uuidSchema } from '@lawfirm/core';

export async function loadStaffMemberships(
  client: Pick<ReturnType<typeof createApiClient>, 'staffMemberships'>,
  userId: string,
  afterId?: string,
  signal?: AbortSignal,
) {
  const actor = uuidSchema.parse(userId);
  try {
    const page = staffMembershipListSchema.parse(await client.staffMemberships(afterId, signal));
    if (
      page.userId !== actor ||
      new Set(page.items.map((item) => item.firmId)).size !== page.items.length ||
      new Set(page.items.map((item) => item.id)).size !== page.items.length ||
      (page.nextCursor && page.nextCursor.afterId !== page.items.at(-1)?.id)
    )
      throw new Error('Unexpected staff memberships');
    return { kind: 'available' as const, page };
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status))
      return { kind: 'denied' as const };
    throw error;
  }
}
