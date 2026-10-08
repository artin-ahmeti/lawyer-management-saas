import { z } from 'zod';
import { uuidSchema } from './common.js';
import { jobStatusSchema } from './execution.js';
import { firmProfileSchema } from './firm.js';

const revision = z.int().min(1).max(2_147_483_647);
export const recoverExecutionSchema = z.strictObject({
  reason: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine(
      (value) =>
        Array.from(value).every((character) => {
          const code = character.charCodeAt(0);
          return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
        }),
      'Use a review reason without control characters.',
    ),
  expectedRevision: revision,
  expectedSourceRevision: revision,
  expectedStatus: z.enum(['failed', 'blocked']),
});
export const recoveryReviewSchema = z
  .strictObject({
    jobId: uuidSchema,
    firm: firmProfileSchema,
    eligible: z.boolean(),
    reason: z.enum(['NOT_TERMINAL', 'SOURCE_INVALID', 'ALREADY_RECOVERED']).nullable(),
    sourceStatus: jobStatusSchema.nullable(),
    sourceRevision: revision.nullable(),
    replacementJobId: uuidSchema.nullable(),
  })
  .refine(
    (review) =>
      review.eligible
        ? review.reason === null &&
          ['failed', 'blocked'].includes(review.sourceStatus ?? '') &&
          review.sourceRevision !== null &&
          review.replacementJobId === null
        : review.reason !== null,
    'Recovery eligibility is inconsistent',
  );
export const recoverExecutionResultSchema = z.strictObject({
  jobId: uuidSchema,
  sourceJobId: uuidSchema,
  commandId: uuidSchema,
  status: z.literal('awaiting_dispatch'),
});
export type RecoverExecution = z.infer<typeof recoverExecutionSchema>;
export type RecoveryReview = z.infer<typeof recoveryReviewSchema>;
export type RecoverExecutionResult = z.infer<typeof recoverExecutionResultSchema>;
