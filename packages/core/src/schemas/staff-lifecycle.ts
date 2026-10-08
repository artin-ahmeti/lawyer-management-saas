import { z } from 'zod';
import { firmRoleSchema, uuidSchema } from './common.js';
import { invitationCursorSchema } from './staff-invitation.js';

const reviewed = {
  userId: uuidSchema,
  expectedRevision: z.number().int().min(1).max(2_147_483_646),
  reason: z.string().trim().min(1).max(500),
};
export const removeStaffMembershipSchema = z.strictObject(reviewed);
// A restored membership never regains matter grants; the role is reviewed again.
export const restoreStaffMembershipSchema = z.strictObject({ ...reviewed, role: firmRoleSchema });
export const staffMembershipResultSchema = z.strictObject({
  firmId: uuidSchema,
  userId: uuidSchema,
  role: firmRoleSchema,
  revision: z.number().int().positive(),
  status: z.enum(['removed', 'active']),
  commandId: uuidSchema,
});
export const removedStaffCursorSchema = z.strictObject({ afterId: uuidSchema.optional() });
export const removedStaffListSchema = z.strictObject({
  firmId: uuidSchema,
  assignableRoles: z.array(firmRoleSchema).max(6),
  items: z
    .array(
      z.strictObject({
        userId: uuidSchema,
        name: z.string().nullable(),
        // Auth may clear or obfuscate the email of the deleted accounts removal exists for.
        email: z.string().max(320).nullable(),
        role: firmRoleSchema,
        revision: z.number().int().positive(),
        isAvailable: z.boolean(),
        removedAt: z.iso.datetime(),
      }),
    )
    .max(20),
  nextCursor: uuidSchema.nullable(),
});
export const staffMembershipHistoryCursorSchema = invitationCursorSchema;
export const staffMembershipHistorySchema = z.strictObject({
  firmId: uuidSchema,
  items: z
    .array(
      z.strictObject({
        id: uuidSchema,
        commandId: uuidSchema,
        actorId: uuidSchema,
        userId: uuidSchema,
        change: z.enum(['removed', 'restored']),
        previousRole: firmRoleSchema,
        role: firmRoleSchema,
        revision: z.number().int().positive(),
        reason: z.string().min(1).max(500),
        createdAt: z.iso.datetime(),
      }),
    )
    .max(20),
  nextCursor: z
    .strictObject({ beforeId: uuidSchema, beforeCreatedAt: z.iso.datetime() })
    .nullable(),
});
export type RemoveStaffMembership = z.infer<typeof removeStaffMembershipSchema>;
export type RestoreStaffMembership = z.infer<typeof restoreStaffMembershipSchema>;
export type StaffMembershipResult = z.infer<typeof staffMembershipResultSchema>;
export type RemovedStaffList = z.infer<typeof removedStaffListSchema>;
export type StaffMembershipHistory = z.infer<typeof staffMembershipHistorySchema>;
export type StaffMembershipHistoryCursor = z.infer<typeof staffMembershipHistoryCursorSchema>;
