import { describe, expect, it } from 'vitest';
import { inspectWorkerHeartbeat, processingReadinessSchema } from './readiness.js';

const now = Date.parse('2026-10-06T12:00:00Z');
const heartbeat = (age: number) =>
  JSON.stringify({
    instanceId: '00000000-0000-4000-8000-000000000001',
    observedAt: new Date(now - age).toISOString(),
  });

describe('bounded worker availability evidence', () => {
  it('accepts only a recent, valid heartbeat', () => {
    expect(inspectWorkerHeartbeat(heartbeat(1000), now)).toEqual({
      worker: 'recently_observed',
      lastWorkerSeenAt: new Date(now - 1000).toISOString(),
    });
  });
  it('does not treat absent, expired, future or malformed evidence as available', () => {
    for (const raw of [
      null,
      heartbeat(15000),
      heartbeat(-1),
      'invalid',
      '{}',
      'x'.repeat(1025),
      JSON.stringify({ instanceId: 'invalid', observedAt: new Date(now).toISOString() }),
    ])
      expect(inspectWorkerHeartbeat(raw, now)).toEqual({
        worker: 'not_observed',
        lastWorkerSeenAt: null,
      });
  });
  it('rejects operational details and contradictory availability in the public contract', () => {
    const result = {
      checkedAt: new Date(now).toISOString(),
      validForMs: 15000,
      database: 'available',
      queue: 'available',
      worker: 'not_observed',
      lastWorkerSeenAt: null,
    };
    expect(processingReadinessSchema.safeParse(result).success).toBe(true);
    expect(processingReadinessSchema.safeParse({ ...result, redisUrl: 'private' }).success).toBe(
      false,
    );
    expect(
      processingReadinessSchema.safeParse({
        ...result,
        queue: 'unavailable',
        worker: 'recently_observed',
        lastWorkerSeenAt: new Date(now).toISOString(),
      }).success,
    ).toBe(false);
  });
});
