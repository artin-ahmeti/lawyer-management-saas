import { z } from 'zod';
import { uuidSchema } from './common.js';
import { renameFirmSchema } from './firm.js';
export const provisionFirmSchema = z.strictObject({ name: renameFirmSchema.shape.name });
export const provisionFirmResultSchema = z.strictObject({
  firmId: uuidSchema,
  commandId: uuidSchema,
  requiresSessionRefresh: z.literal(true),
});
export type ProvisionFirm = z.infer<typeof provisionFirmSchema>;
export type ProvisionFirmResult = z.infer<typeof provisionFirmResultSchema>;
