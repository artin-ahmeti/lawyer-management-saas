import { z } from 'zod';
import { uuidSchema } from './common.js';

export const createMatterSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  reference: z.string().trim().min(1).max(80).optional(),
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
