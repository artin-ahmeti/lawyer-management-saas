import { describe, expect, it } from 'vitest';
import { jobEnvelopeSchema, firmRenamedEventSchema } from './execution.js';
const id = '00000000-0000-4000-a000-000000000001';
describe('queue boundary', () => {
  it('accepts only an opaque job UUID, never actor claims, payloads, or instructions', () => {
    expect(jobEnvelopeSchema.parse({ jobId: id })).toEqual({ jobId: id });
    for (const data of [
      null,
      { jobId: 'invalid' },
      { jobId: id, firmId: id },
      { jobId: id, role: 'owner' },
    ])
      expect(jobEnvelopeSchema.safeParse(data).success).toBe(false);
  });
  it('requires a bounded source revision and rejects additional event fields', () => {
    expect(firmRenamedEventSchema.safeParse({ firmId: id, revision: 1 }).success).toBe(true);
    for (const revision of [0, -1, 1.5, 2147483648])
      expect(firmRenamedEventSchema.safeParse({ firmId: id, revision }).success).toBe(false);
    expect(
      firmRenamedEventSchema.safeParse({ firmId: id, revision: 1, instruction: 'publish data' })
        .success,
    ).toBe(false);
  });
});
