import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { expect, it } from 'vitest';
import { ProcessingReadinessService } from './processing-readiness.service';

it('does not fabricate a configured queue or worker', async () => {
  const service = new ProcessingReadinessService(new ConfigService({ REDIS_URL: '' }));
  try {
    expect(await service.inspect()).toEqual({
      queue: 'unconfigured',
      worker: 'unknown',
      lastWorkerSeenAt: null,
    });
  } finally {
    service.onApplicationShutdown();
  }
});
it('a disconnected queue fails promptly and never reports a worker', async () => {
  const service = new ProcessingReadinessService(
    new ConfigService({
      REDIS_URL: 'redis://127.0.0.1:1',
      DATABASE_URL: 'postgresql://localhost/test',
    }),
  );
  const start = performance.now();
  try {
    expect(await service.inspect()).toEqual({
      queue: 'unavailable',
      worker: 'unknown',
      lastWorkerSeenAt: null,
    });
    expect(performance.now() - start).toBeLessThan(1500);
  } finally {
    service.onApplicationShutdown();
  }
});
