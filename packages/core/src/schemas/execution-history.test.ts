import { describe, expect, it } from 'vitest';
import { firmExecutionHistorySchema } from './execution.js';

const jobId = '00000000-0000-4000-a000-000000000001';
const attempt = {
  number: 2,
  status: 'interrupted',
  errorCode: 'LEASE_EXPIRED',
  startedAt: '2026-10-06T10:30:00.000Z',
  finishedAt: '2026-10-06T10:31:00.000Z',
};
const history = { jobId, attemptCount: 2, unrecordedAttempts: 1, items: [attempt] };
describe('bounded truthful execution history', () => {
  it('accepts recorded attempts and explicitly missing historical evidence', () => {
    expect(firmExecutionHistorySchema.parse(history)).toEqual(history);
    expect(
      firmExecutionHistorySchema.parse({ jobId, attemptCount: 0, unrecordedAttempts: 0, items: [] })
        .items,
    ).toEqual([]);
  });
  it('rejects private fields, impossible outcomes and misleading coverage', () => {
    for (const data of [
      { ...history, items: [{ ...attempt, leaseToken: jobId }] },
      { ...history, unrecordedAttempts: 0 },
      { ...history, items: [{ ...attempt, number: 3 }] },
      { ...history, items: [{ ...attempt, finishedAt: null }] },
      { ...history, items: [{ ...attempt, status: 'succeeded' }] },
      { ...history, items: [{ ...attempt, errorCode: null }] },
      { ...history, items: [{ ...attempt, finishedAt: '2026-10-06T10:29:00.000Z' }] },
      { ...history, attemptCount: 6 },
      { ...history, unrecordedAttempts: 0, items: [attempt, attempt] },
    ])
      expect(firmExecutionHistorySchema.safeParse(data).success).toBe(false);
  });
});
