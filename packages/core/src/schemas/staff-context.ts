import { z } from 'zod';
import { emailSchema, firmRoleSchema, uuidSchema } from './common.js';

/** Supported firm operations only. Matter, client and financial authority have separate gates. */
export const firmCapabilitySchema = z.enum([
  'firm.profile.read',
  'firm.profile.rename',
  'firm.processing.inspect',
  'firm.processing.request',
  'firm.staff.invitations.manage',
  'firm.staff.roles.manage',
  'firm.staff.memberships.manage',
]);
export const staffContextSchema = z
  .strictObject({
    userId: uuidSchema,
    email: emailSchema.optional(),
    firmId: uuidSchema.optional(),
    role: firmRoleSchema.optional(),
    capabilities: z.array(firmCapabilitySchema).max(firmCapabilitySchema.options.length),
  })
  .refine(
    (context) =>
      new Set(context.capabilities).size === context.capabilities.length &&
      (context.firmId
        ? context.role !== undefined
        : context.role === undefined && context.capabilities.length === 0),
    'Current firm, role and capabilities are inconsistent',
  );
export type StaffContext = z.infer<typeof staffContextSchema>;
export type FirmCapability = z.infer<typeof firmCapabilitySchema>;
