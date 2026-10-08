import { expect, it, vi } from 'vitest';
import { pollWithReadiness } from './readiness.js';

it('publishes evidence only after successful processing polls and available consumption', async () => {
  const heartbeat = vi.fn(async () => undefined);
  await pollWithReadiness(
    async () => {
      throw new Error('Database failed');
    },
    () => true,
    heartbeat,
  ).catch(() => undefined);
  expect(heartbeat).not.toHaveBeenCalled();
  await pollWithReadiness(
    async () => undefined,
    () => false,
    heartbeat,
  );
  expect(heartbeat).not.toHaveBeenCalled();
  await pollWithReadiness(
    async () => undefined,
    () => true,
    heartbeat,
  );
  expect(heartbeat).toHaveBeenCalledOnce();
});
