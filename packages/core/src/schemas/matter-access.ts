import { z } from 'zod';
import { firmRoleSchema, uuidSchema } from './common.js';
import { invitationCursorSchema } from './staff-invitation.js';

export const matterAccessRoleSchema = z.enum(['reader', 'manager']);
export const changeMatterAccessSchema = z.strictObject({
  userId: uuidSchema,
  role: matterAccessRoleSchema.nullable(),
  expectedRevision: z.number().int().min(1).max(2_147_483_646),
  reason: z.string().trim().min(1).max(500),
});
const scope = { firmId: uuidSchema, matterId: uuidSchema };
const person = {
  userId: uuidSchema,
  name: z.string().nullable(),
  email: z.email().max(320),
  staffRole: firmRoleSchema,
};
export const matterAccessListSchema = z.strictObject({
  ...scope,
  revision: z.number().int().positive(),
  items: z
    .array(
      z.strictObject({
        ...person,
        role: matterAccessRoleSchema,
        revision: z.number().int().positive(),
        isActive: z.boolean(),
      }),
    )
    .max(20),
  nextCursor: uuidSchema.nullable(),
});
export const matterAccessCandidatesSchema = z.strictObject({
  ...scope,
  items: z.array(z.strictObject({ ...person, canManage: z.boolean() })).max(20),
  nextCursor: uuidSchema.nullable(),
});
export const changeMatterAccessResultSchema = z.strictObject({
  ...scope,
  userId: uuidSchema,
  role: matterAccessRoleSchema.nullable(),
  revision: z.number().int().positive(),
  commandId: uuidSchema,
});
export const matterAccessHistoryQuerySchema = invitationCursorSchema;
export const matterAccessHistorySchema = z.strictObject({
  ...scope,
  items: z
    .array(
      z.strictObject({
        id: uuidSchema,
        commandId: uuidSchema,
        actorId: uuidSchema,
        userId: uuidSchema,
        previousRole: matterAccessRoleSchema.nullable(),
        role: matterAccessRoleSchema.nullable(),
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
export type ChangeMatterAccess = z.infer<typeof changeMatterAccessSchema>;
export type MatterAccessList = z.infer<typeof matterAccessListSchema>;
export type MatterAccessCandidates = z.infer<typeof matterAccessCandidatesSchema>;
export type ChangeMatterAccessResult = z.infer<typeof changeMatterAccessResultSchema>;
export type MatterAccessHistory = z.infer<typeof matterAccessHistorySchema>;
export type MatterAccessHistoryQuery = z.infer<typeof matterAccessHistoryQuerySchema>;
