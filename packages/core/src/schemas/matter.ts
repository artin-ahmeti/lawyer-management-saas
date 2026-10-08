import { z } from 'zod';
import { uuidSchema } from './common.js';
import { practiceFieldValuesSchema } from './practice-profile.js';

/** A profile version is optional; its field values need that version (M02-S03, D022). */
export const createMatterSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(200),
    reference: z.string().trim().min(1).max(80).optional(),
    profileVersionId: uuidSchema.optional(),
    fieldValues: practiceFieldValuesSchema.optional(),
  })
  .refine((v) => v.fieldValues === undefined || v.profileVersionId !== undefined, {
    message: 'Field values need a practice profile.',
    path: ['fieldValues'],
  });
export const matterParamsSchema = z.strictObject({ matterId: uuidSchema });
export const matterListQuerySchema = z.strictObject({ afterId: uuidSchema.optional() });
export const matterSchema = z.strictObject({
  id: uuidSchema,
  firmId: uuidSchema,
  title: z.string().min(1).max(200),
  reference: z.string().max(80).nullable(),
  revision: z.number().int().min(1),
  createdAt: z.iso.datetime(),
  accessRole: z.enum(['reader', 'manager']),
  /** The pinned practice profile version, without its values. */
  profile: z
    .strictObject({
      id: uuidSchema,
      name: z.string().min(1).max(80),
      version: z.number().int().min(1),
    })
    .nullable(),
});
export const matterListSchema = z.strictObject({
  items: z.array(matterSchema).max(20),
  nextCursor: uuidSchema.nullable(),
  canCreate: z.boolean(),
});
export const createMatterResultSchema = z.strictObject({
  matter: matterSchema,
  commandId: uuidSchema,
});
export type CreateMatter = z.infer<typeof createMatterSchema>;
export type MatterRecord = z.infer<typeof matterSchema>;
export type MatterList = z.infer<typeof matterListSchema>;
export type CreateMatterResult = z.infer<typeof createMatterResultSchema>;
