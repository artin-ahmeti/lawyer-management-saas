import { ApiError, type createApiClient } from '@lawfirm/api-client';
import { staffContextSchema, uuidSchema, type StaffContext, type FirmRole } from '@lawfirm/core';
export type StaffContextRead =
  | { kind: 'available'; context: StaffContext & { firmId: string; role: FirmRole } }
  | { kind: 'denied' };
export async function loadStaffContext(
  client: Pick<ReturnType<typeof createApiClient>, 'staffContext'>,
  userId: string,
  firmId: string,
  signal?: AbortSignal,
): Promise<StaffContextRead> {
  const actor = uuidSchema.parse(userId);
  const firm = uuidSchema.parse(firmId);
  try {
    const context = staffContextSchema.parse(await client.staffContext(signal));
    if (context.userId !== actor || context.firmId !== firm || !context.role)
      throw new Error('Unexpected staff context');
    return { kind: 'available', context: { ...context, firmId: firm, role: context.role } };
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) return { kind: 'denied' };
    throw error;
  }
}
