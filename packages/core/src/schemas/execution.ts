import { z } from 'zod';
import { uuidSchema } from './common.js';

// Redis carries only an opaque reference; firm, actor, payload and authorization come from Postgres.
export const jobEnvelopeSchema = z.strictObject({ jobId: uuidSchema });
export const firmRenamedEventSchema = z.strictObject({
  firmId: uuidSchema,
  revision: z.int().min(1).max(2147483647),
});
export const jobStatusSchema = z.enum([
  'awaiting_dispatch',
  'pending',
  'retry',
  'running',
  'succeeded',
  'blocked',
  'failed',
]);
export const executionErrorCodeSchema = z.enum([
  'QUEUE_UNAVAILABLE',
  'ACCESS_REVOKED',
  'SOURCE_CHANGED',
  'SOURCE_UNAVAILABLE',
  'INVALID_EVENT',
  'UNSUPPORTED_EVENT',
  'PROCESSING_FAILED',
  'ATTEMPTS_EXHAUSTED',
]);
export const firmExecutionListSchema = z.strictObject({
  items: z
    .array(
      z.strictObject({
        id: uuidSchema,
        commandId: uuidSchema,
        requestId: uuidSchema,
        eventType: z.enum(['firm.renamed.v1', 'firm.profile-check-requested.v1']),
        status: jobStatusSchema,
        attempts: z.int().min(0).max(5),
        dispatchAttempts: z.int().nonnegative(),
        availableAt: z.iso.datetime({ offset: true }),
        completedAt: z.iso.datetime({ offset: true }).nullable(),
        errorCode: executionErrorCodeSchema.nullable(),
      }),
    )
    .max(20),
});
export type FirmExecutionList = z.infer<typeof firmExecutionListSchema>;

export const executionAttemptSchema = z
  .strictObject({
    number: z.int().min(1).max(5),
    status: z.enum(['running', 'retry', 'succeeded', 'blocked', 'failed', 'interrupted']),
    startedAt: z.iso.datetime({ offset: true }),
    finishedAt: z.iso.datetime({ offset: true }).nullable(),
    errorCode: executionErrorCodeSchema.or(z.literal('LEASE_EXPIRED')).nullable(),
  })
  .refine((attempt) => {
    if ((attempt.status === 'running') !== (attempt.finishedAt === null)) return false;
    if (attempt.finishedAt && Date.parse(attempt.finishedAt) < Date.parse(attempt.startedAt))
      return false;
    switch (attempt.status) {
      case 'running':
      case 'succeeded':
        return attempt.errorCode === null;
      case 'interrupted':
        return attempt.errorCode === 'LEASE_EXPIRED';
      case 'retry':
      case 'failed':
        return attempt.errorCode === 'PROCESSING_FAILED';
      case 'blocked':
        return [
          'ACCESS_REVOKED',
          'SOURCE_CHANGED',
          'SOURCE_UNAVAILABLE',
          'INVALID_EVENT',
          'UNSUPPORTED_EVENT',
        ].includes(attempt.errorCode ?? '');
    }
  }, 'Attempt outcome is inconsistent');

export const firmExecutionHistoryParamsSchema = z.strictObject({ jobId: uuidSchema });
export const firmExecutionHistorySchema = z
  .strictObject({
    jobId: uuidSchema,
    attemptCount: z.int().min(0).max(5),
    unrecordedAttempts: z.int().min(0).max(5),
    items: z.array(executionAttemptSchema).max(5),
  })
  .refine(
    (history) =>
      history.unrecordedAttempts + history.items.length === history.attemptCount &&
      history.items.every(
        (attempt, index) =>
          attempt.number <= history.attemptCount &&
          (index === 0 || attempt.number > history.items[index - 1]!.number),
      ),
    'Attempt coverage or ordering is inconsistent',
  );
export type ExecutionAttempt = z.infer<typeof executionAttemptSchema>;
export type FirmExecutionHistory = z.infer<typeof firmExecutionHistorySchema>;
