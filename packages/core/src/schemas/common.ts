import { z } from 'zod';

/** Shared field primitives — the single source of validation truth (Plan §2). */
export const uuidSchema = z.uuid();
export const emailSchema = z.email().max(320);

/** Integer cents; matches numeric(19,4) columns. */
export const centsSchema = z.number().int().safe();

/** Durations are integer minutes everywhere (Plan §5). */
export const durationMinutesSchema = z
  .number()
  .int()
  .min(0)
  .max(24 * 60);

export const firmRoleSchema = z.enum([
  'owner',
  'admin',
  'attorney',
  'paralegal',
  'billing',
  'readonly',
]);
export type FirmRole = z.infer<typeof firmRoleSchema>;
