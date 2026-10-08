import { z } from 'zod';
import { firmRoleSchema, uuidSchema } from './common.js';
import { invitationCursorSchema } from './staff-invitation.js';

export const changeStaffRoleSchema = z.strictObject({
  userId: uuidSchema,
  role: firmRoleSchema,
  expectedRevision: z.number().int().min(1).max(2_147_483_646),
  reason: z.string().trim().min(1).max(500),
});
export const firmStaffCursorSchema = z.strictObject({ afterId: uuidSchema.optional() });
export const firmStaffListSchema = z.strictObject({
  firmId: uuidSchema,
  assignableRoles: z.array(firmRoleSchema).max(6),
  items: z
    .array(
      z.strictObject({
        userId: uuidSchema,
        name: z.string().nullable(),
        email: z.email().max(320),
        role: firmRoleSchema,
        revision: z.number().int().positive(),
        isAvailable: z.boolean(),
      }),
    )
    .max(20),
  nextCursor: uuidSchema.nullable(),
});
export const changeStaffRoleResultSchema = z.strictObject({
  firmId: uuidSchema,
  userId: uuidSchema,
  role: firmRoleSchema,
  revision: z.number().int().positive(),
  commandId: uuidSchema,
});
export const staffRoleHistoryCursorSchema = invitationCursorSchema;
export const staffRoleHistorySchema = z.strictObject({
  firmId: uuidSchema,
  items: z
    .array(
      z.strictObject({
        id: uuidSchema,
        commandId: uuidSchema,
        actorId: uuidSchema,
        userId: uuidSchema,
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
export type ChangeStaffRole = z.infer<typeof changeStaffRoleSchema>;
export type FirmStaffList = z.infer<typeof firmStaffListSchema>;
export type ChangeStaffRoleResult = z.infer<typeof changeStaffRoleResultSchema>;
export type StaffRoleHistory = z.infer<typeof staffRoleHistorySchema>;
export type StaffRoleHistoryCursor = z.infer<typeof staffRoleHistoryCursorSchema>;
