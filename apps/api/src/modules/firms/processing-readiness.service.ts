import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { inspectWorkerHeartbeat, type ProcessingReadiness } from '@lawfirm/core';
import { workerReadinessKey } from '@lawfirm/db';
import { Redis } from 'ioredis';

@Injectable()
export class ProcessingReadinessService implements OnApplicationShutdown {
  private readonly redis?: Redis;
  private readonly key?: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const url = config.get<string>('REDIS_URL');
    if (!url) return;
    if (!['redis:', 'rediss:'].includes(new URL(url).protocol))
      throw new Error('Invalid Redis protocol');
    this.key = workerReadinessKey(config.getOrThrow<string>('DATABASE_URL'));
    // Bounded read-only probes; disconnected commands are never saved for later replay.
    // https://github.com/redis/ioredis#offline-queue
    this.redis = new Redis(url, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      commandTimeout: 1000,
      connectTimeout: 1000,
      retryStrategy: () => 2000,
    });
    // Probe outcomes are logged with the request by FirmService; never log connection errors/URLs.
    this.redis.on('error', () => undefined);
  }

  async inspect(): Promise<Pick<ProcessingReadiness, 'queue' | 'worker' | 'lastWorkerSeenAt'>> {
    if (!this.redis) return { queue: 'unconfigured', worker: 'unknown', lastWorkerSeenAt: null };
    try {
      if (this.redis.status !== 'ready') throw new Error('Queue unavailable');
      const [pong, heartbeat] = await Promise.all([this.redis.ping(), this.redis.get(this.key!)]);
      if (pong !== 'PONG') throw new Error('Queue unavailable');
      return { queue: 'available', ...inspectWorkerHeartbeat(heartbeat, Date.now()) };
    } catch {
      return { queue: 'unavailable', worker: 'unknown', lastWorkerSeenAt: null };
    }
  }

  onApplicationShutdown() {
    this.redis?.disconnect();
  }
}
