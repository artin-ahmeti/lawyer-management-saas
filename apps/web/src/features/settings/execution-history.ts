import { ApiError, type createApiClient } from '@lawfirm/api-client';
import {
  firmExecutionHistorySchema,
  uuidSchema,
  type ExecutionAttempt,
  type FirmExecutionHistory,
} from '@lawfirm/core';
import { executionErrorReasons } from './firm-executions';

export type ExecutionHistoryRead =
  | { kind: 'available'; history: FirmExecutionHistory }
  | { kind: 'denied' }
  | { kind: 'unavailable' };

export async function loadExecutionHistory(
  client: Pick<ReturnType<typeof createApiClient>, 'executionHistory'>,
  jobId: string,
  signal?: AbortSignal,
): Promise<ExecutionHistoryRead> {
  const id = uuidSchema.parse(jobId);
  try {
    const history = firmExecutionHistorySchema.parse(await client.executionHistory(id, signal));
    if (history.jobId !== id) throw new Error('Unexpected execution reference');
    return { kind: 'available', history };
  } catch (error) {
    if (error instanceof ApiError) {
      if ([401, 403].includes(error.status)) return { kind: 'denied' };
      if (error.status === 404) return { kind: 'unavailable' };
    }
    throw error;
  }
}

const outcomes: Record<ExecutionAttempt['status'], { label: string; detail: string }> = {
  running: {
    label: 'Processing',
    detail: 'A worker claimed this attempt. Completion is not confirmed.',
  },
  succeeded: { label: 'Completed', detail: 'The firm profile was verified.' },
  retry: {
    label: 'Retry scheduled',
    detail:
      'This attempt could not complete. Another attempt is eligible after the recorded delay.',
  },
  failed: {
    label: 'Failed',
    detail: 'This attempt could not complete. The automatic attempt limit was reached.',
  },
  blocked: { label: 'Blocked', detail: 'This attempt could not proceed.' },
  interrupted: {
    label: 'Interrupted',
    detail: 'The worker lease expired. Completion of this attempt was not confirmed.',
  },
};
export function describeExecutionAttempt(attempt: ExecutionAttempt) {
  const view = outcomes[attempt.status];
  const reason =
    attempt.errorCode && attempt.errorCode !== 'LEASE_EXPIRED'
      ? executionErrorReasons[attempt.errorCode]
      : null;
  return { ...view, detail: reason ? `${view.detail} ${reason}` : view.detail };
}
