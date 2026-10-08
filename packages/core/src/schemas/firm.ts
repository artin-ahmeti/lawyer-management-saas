import { z } from 'zod';
import { firmRoleSchema, uuidSchema } from './common.js';

/** Authority comes from verified identity and current database membership, never the body. */
export const staffClaimsSchema = z.object({
  sub: uuidSchema,
  role: z.literal('authenticated'),
  email: z.string().optional(),
  firm_id: uuidSchema.optional(),
  user_role: firmRoleSchema.optional(),
  session_id: uuidSchema.optional(),
  staff_context_revision: z.number().int().min(1).max(2_147_483_647).optional(),
});

export const renameFirmSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine(
      (name) =>
        Array.from(name).every((character) => {
          const code = character.charCodeAt(0);
          return code >= 32 && code !== 127;
        }),
      'Use a single-line firm name without control characters.',
    ),
  expectedRevision: z.number().int().min(0).max(2_147_483_646),
});

export const firmProfileSchema = z.strictObject({
  id: uuidSchema,
  name: z.string(),
  revision: z.number().int().nonnegative(),
  canRename: z.boolean(),
});

export const renameFirmResultSchema = z.strictObject({
  firm: firmProfileSchema,
  commandId: uuidSchema,
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: uuidSchema,
});

export type RenameFirm = z.infer<typeof renameFirmSchema>;
export type FirmProfile = z.infer<typeof firmProfileSchema>;
export type RenameFirmResult = z.infer<typeof renameFirmResultSchema>;
