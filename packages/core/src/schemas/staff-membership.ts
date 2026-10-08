import { z } from 'zod';
import { firmRoleSchema, uuidSchema } from './common.js';

export const staffMembershipCursorSchema = z.strictObject({ afterId: uuidSchema.optional() });
export const staffMembershipSchema = z.strictObject({
  id: uuidSchema,
  firmId: uuidSchema,
  firmName: z.string(),
  role: firmRoleSchema,
});
export const staffMembershipListSchema = z.strictObject({
  userId: uuidSchema,
  items: z.array(staffMembershipSchema).max(20),
  nextCursor: z.strictObject({ afterId: uuidSchema }).nullable(),
});
export type StaffMembership = z.infer<typeof staffMembershipSchema>;
export type StaffMembershipCursor = z.infer<typeof staffMembershipCursorSchema>;
export type StaffMembershipList = z.infer<typeof staffMembershipListSchema>;
