import { expect, it } from 'vitest';
import { workerConfig } from './config.js';
it('requires explicit server connections and rejects unrelated URL protocols', () => {
  expect(() => workerConfig({})).toThrow('required');
  expect(() =>
    workerConfig({ DATABASE_URL: 'https://example.com', REDIS_URL: 'redis://localhost' }),
  ).toThrow('protocol');
  expect(
    workerConfig({ DATABASE_URL: 'postgresql://localhost/db', REDIS_URL: 'rediss://localhost' }),
  ).toEqual({ databaseUrl: 'postgresql://localhost/db', redisUrl: 'rediss://localhost' });
});
