import { ApiError, type createApiClient } from '@lawfirm/api-client';
import {
  recoverExecutionSchema,
  recoverExecutionResultSchema,
  recoveryReviewSchema,
  uuidSchema,
  type RecoverExecution,
  type RecoveryReview,
} from '@lawfirm/core';

export type RecoveryRead =
  { kind: 'available'; review: RecoveryReview } | { kind: 'denied' | 'unavailable' };
export type RecoveryIntent = {
  jobId: string;
  input: RecoverExecution;
  idempotencyKey: string;
  requestId: string;
};
export async function loadRecoveryReview(
  client: Pick<ReturnType<typeof createApiClient>, 'recoveryReview'>,
  jobId: string,
  firmId: string,
  signal?: AbortSignal,
): Promise<RecoveryRead> {
  const id = uuidSchema.parse(jobId);
  const firm = uuidSchema.parse(firmId);
  try {
    const review = recoveryReviewSchema.parse(await client.recoveryReview(id, signal));
    if (review.jobId !== id || review.firm.id !== firm)
      throw new Error('Unexpected review context');
    return { kind: 'available', review };
  } catch (error) {
    if (error instanceof ApiError) {
      if ([401, 403].includes(error.status)) return { kind: 'denied' };
      if (error.status === 404) return { kind: 'unavailable' };
    }
    throw error;
  }
}
export function prepareRecovery(data: unknown, reason: string): RecoveryIntent {
  const review = recoveryReviewSchema.parse(data);
  if (!review.eligible) throw new Error('Review is not eligible');
  return {
    jobId: review.jobId,
    input: recoverExecutionSchema.parse({
      reason,
      expectedRevision: review.firm.revision,
      expectedSourceRevision: review.sourceRevision,
      expectedStatus: review.sourceStatus,
    }),
    idempotencyKey: crypto.randomUUID(),
    requestId: crypto.randomUUID(),
  };
}
export async function submitRecovery(
  client: Pick<ReturnType<typeof createApiClient>, 'recoverExecution'>,
  intent: RecoveryIntent,
  signal?: AbortSignal,
) {
  const result = recoverExecutionResultSchema.parse(
    await client.recoverExecution(intent.jobId, intent.input, { ...intent, signal }),
  );
  if (result.sourceJobId !== intent.jobId || result.jobId === intent.jobId)
    throw new Error('Unexpected replacement context');
  return result;
}
