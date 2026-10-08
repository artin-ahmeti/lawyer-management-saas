import { z } from 'zod';
import { uuidSchema } from './common.js';

/** Ownership changes have a separate review contract. */
export const invitedStaffRoleSchema = z.enum([
  'admin',
  'attorney',
  'paralegal',
  'billing',
  'readonly',
]);
export const invitationEmailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
export const createStaffInvitationSchema = z.strictObject({
  email: invitationEmailSchema,
  role: invitedStaffRoleSchema,
});
export const invitationRevisionSchema = z.strictObject({
  expectedRevision: z.number().int().min(1).max(2_147_483_646),
});
export const invitationParamsSchema = z.strictObject({ invitationId: uuidSchema });
const cursorShape = {
  beforeId: uuidSchema.optional(),
  beforeCreatedAt: z.iso.datetime().optional(),
};
export const invitationCursorSchema = z
  .strictObject(cursorShape)
  .refine(
    (value) => Boolean(value.beforeId) === Boolean(value.beforeCreatedAt),
    'Cursor fields must be paired',
  );
const nextCursor = z
  .strictObject({ beforeId: uuidSchema, beforeCreatedAt: z.iso.datetime() })
  .nullable();
const invitationFields = {
  id: uuidSchema,
  firmId: uuidSchema,
  role: invitedStaffRoleSchema,
  revision: z.number().int().positive(),
  status: z.enum(['pending', 'accepted', 'revoked', 'expired']),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  delivery: z.literal('unavailable'),
};
export const staffInvitationSchema = z.strictObject({
  ...invitationFields,
  email: invitationEmailSchema,
});
export const staffInvitationListSchema = z.strictObject({
  firmId: uuidSchema,
  items: z.array(staffInvitationSchema).max(20),
  nextCursor,
});
export const receivedInvitationSchema = z.strictObject({
  ...invitationFields,
  status: z.literal('pending'),
  firmName: z.string(),
});
export const receivedInvitationListSchema = z.strictObject({
  userId: uuidSchema,
  items: z.array(receivedInvitationSchema).max(20),
  nextCursor,
});
export const staffInvitationCommandResultSchema = z
  .strictObject({
    invitationId: uuidSchema,
    firmId: uuidSchema,
    commandId: uuidSchema,
    revision: z.number().int().positive(),
    status: z.enum(['pending', 'accepted', 'revoked']),
    delivery: z.literal('unavailable'),
    requiresSessionRefresh: z.boolean(),
  })
  .refine(
    (value) => value.requiresSessionRefresh === (value.status === 'accepted'),
    'Only acceptance requires session renewal',
  );
export const staffInvitationCheckEventSchema = z.strictObject({
  firmId: uuidSchema,
  invitationId: uuidSchema,
  revision: z.number().int().positive(),
});
export type CreateStaffInvitation = z.infer<typeof createStaffInvitationSchema>;
export type InvitationRevision = z.infer<typeof invitationRevisionSchema>;
export type InvitationCursor = z.infer<typeof invitationCursorSchema>;
export type StaffInvitation = z.infer<typeof staffInvitationSchema>;
export type StaffInvitationList = z.infer<typeof staffInvitationListSchema>;
export type ReceivedInvitationList = z.infer<typeof receivedInvitationListSchema>;
export type StaffInvitationCommandResult = z.infer<typeof staffInvitationCommandResultSchema>;
