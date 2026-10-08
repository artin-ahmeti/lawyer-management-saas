import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { workerReadinessKey } from '@lawfirm/db';
import { Redis } from 'ioredis';
import postgres from 'postgres';
import { expect, it } from 'vitest';
import { ProcessingReadinessService } from '../src/modules/firms/processing-readiness.service';
import { FirmService } from '../src/modules/firms/firm.service';
import { StaffAccessService } from '../src/common/auth/staff-access.service';

it('reads actual Redis evidence, isolates database scopes and rejects corrupt or old signals', async () => {
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
  if (!['localhost', '127.0.0.1'].includes(new URL(redisUrl).hostname))
    throw new Error('Local Redis required');
  const databaseUrl = `postgresql://localhost/test_${randomUUID()}`;
  const key = workerReadinessKey(databaseUrl);
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, commandTimeout: 1000 });
  redis.on('error', () => undefined);
  const service = new ProcessingReadinessService(
    new ConfigService({ REDIS_URL: redisUrl, DATABASE_URL: databaseUrl }),
  );
  try {
    await expect
      .poll(() => service.inspect())
      .toMatchObject({ queue: 'available', worker: 'not_observed' });
    const observedAt = new Date().toISOString();
    await redis.set(key, JSON.stringify({ instanceId: randomUUID(), observedAt }), 'PX', 15000);
    expect(await service.inspect()).toEqual({
      queue: 'available',
      worker: 'recently_observed',
      lastWorkerSeenAt: observedAt,
    });
    for (const raw of [
      'invalid',
      JSON.stringify({
        instanceId: randomUUID(),
        observedAt: new Date(Date.now() - 16000).toISOString(),
      }),
    ]) {
      await redis.set(key, raw, 'PX', 15000);
      expect(await service.inspect()).toEqual({
        queue: 'available',
        worker: 'not_observed',
        lastWorkerSeenAt: null,
      });
    }
    await redis.del(key);
    expect(await service.inspect()).toMatchObject({ worker: 'not_observed' });
    service.onApplicationShutdown();
    expect(await service.inspect()).toEqual({
      queue: 'unavailable',
      worker: 'unknown',
      lastWorkerSeenAt: null,
    });
  } finally {
    await redis.del(key).catch(() => undefined);
    redis.disconnect();
    service.onApplicationShutdown();
  }
});

it('a database outage cannot authorize or manufacture an available snapshot', async () => {
  const sql = postgres('postgresql://localhost:1/unavailable', { connect_timeout: 1, max: 1 });
  const probe = new ProcessingReadinessService(new ConfigService({ REDIS_URL: '' }));
  const database = {
    sql,
    onApplicationShutdown: async () => {
      await sql.end({ timeout: 1 });
    },
  };
  const service = new FirmService(database, probe, new StaffAccessService(database));
  try {
    await expect(
      service.processingReadiness(
        { sub: randomUUID(), firm_id: randomUUID(), role: 'authenticated' },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ status: 503 });
  } finally {
    await sql.end({ timeout: 1 });
    probe.onApplicationShutdown();
  }
});
