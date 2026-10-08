import { expect, it } from 'vitest';
import { workerReadinessKey } from '../src/readiness.js';

it('isolates telemetry by connection target while excluding credentials and options', () => {
  const key = workerReadinessKey('postgres://first:secret@localhost:5432/firm?sslmode=require');
  expect(workerReadinessKey('postgresql://second:other@localhost/firm')).toBe(key);
  expect(workerReadinessKey('postgresql://localhost/other')).not.toBe(key);
  expect(workerReadinessKey('postgresql://elsewhere/firm')).not.toBe(key);
  expect(key).toMatch(/^clepso-execution-v1:readiness:[a-f0-9]{64}$/);
  expect(() => workerReadinessKey('https://localhost/firm')).toThrow();
});
