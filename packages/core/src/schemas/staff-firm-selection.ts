import { z } from 'zod';
import { uuidSchema } from './common.js';

/** Decoded only for cache/intent binding. This is never an authorization decision. */
export const staffSessionScopeSchema = z.object({
  session_id: uuidSchema,
  firm_id: uuidSchema.optional(),
  staff_context_revision: z.number().int().min(1).max(2_147_483_647).optional(),
});

export const activeFirmSelectionSchema = z.strictObject({
  userId: uuidSchema,
  firmId: uuidSchema.optional(),
  revision: z.number().int().min(0).max(2_147_483_647),
});
export const selectStaffFirmSchema = z.strictObject({
  firmId: uuidSchema,
  expectedRevision: z.number().int().min(0).max(2_147_483_646),
});
export const selectStaffFirmResultSchema = z.strictObject({
  userId: uuidSchema,
  firmId: uuidSchema,
  revision: z.number().int().min(1).max(2_147_483_647),
  commandId: uuidSchema,
  requiresSessionRefresh: z.literal(true),
});
export type ActiveFirmSelection = z.infer<typeof activeFirmSelectionSchema>;
export type SelectStaffFirm = z.infer<typeof selectStaffFirmSchema>;
export type SelectStaffFirmResult = z.infer<typeof selectStaffFirmResultSchema>;
