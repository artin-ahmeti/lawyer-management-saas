import { z } from 'zod';
import { uuidSchema } from './common.js';

export const processingAvailabilityWindowMs = 15000;
export const workerHeartbeatSchema = z.strictObject({
  instanceId: uuidSchema,
  observedAt: z.iso.datetime({ offset: true }),
});
export const processingReadinessSchema = z
  .strictObject({
    checkedAt: z.iso.datetime({ offset: true }),
    validForMs: z.literal(processingAvailabilityWindowMs),
    database: z.literal('available'),
    queue: z.enum(['available', 'unavailable', 'unconfigured']),
    worker: z.enum(['recently_observed', 'not_observed', 'unknown']),
    lastWorkerSeenAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .superRefine((value, context) => {
    const observed = value.worker === 'recently_observed';
    const age = value.lastWorkerSeenAt
      ? Date.parse(value.checkedAt) - Date.parse(value.lastWorkerSeenAt)
      : null;
    if (
      observed !== (value.lastWorkerSeenAt !== null) ||
      (observed &&
        (value.queue !== 'available' || age === null || age < 0 || age >= value.validForMs)) ||
      (value.queue !== 'available' && value.worker !== 'unknown')
    )
      context.addIssue({ code: 'custom', message: 'Inconsistent processing availability.' });
  });
export type ProcessingReadiness = z.infer<typeof processingReadinessSchema>;

/** Redis telemetry is untrusted and short-lived; it cannot establish any job outcome. */
export function inspectWorkerHeartbeat(
  raw: string | null,
  now: number,
): Pick<ProcessingReadiness, 'worker' | 'lastWorkerSeenAt'> {
  let value: unknown;
  try {
    if (!raw || raw.length > 1024) throw new Error('Invalid heartbeat');
    value = JSON.parse(raw);
  } catch {
    return { worker: 'not_observed', lastWorkerSeenAt: null };
  }
  const heartbeat = workerHeartbeatSchema.safeParse(value);
  const age = heartbeat.success ? now - Date.parse(heartbeat.data.observedAt) : -1;
  if (!heartbeat.success || age < 0 || age >= processingAvailabilityWindowMs)
    return { worker: 'not_observed', lastWorkerSeenAt: null };
  return { worker: 'recently_observed', lastWorkerSeenAt: heartbeat.data.observedAt };
}
