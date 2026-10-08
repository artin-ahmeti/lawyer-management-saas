import { createHash } from 'node:crypto';

/** Server-only namespace; credentials/query options never enter Redis keys or API responses. */
export function workerReadinessKey(databaseUrl: string) {
  const url = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('Invalid database protocol');
  const target = `${url.hostname.toLowerCase()}:${url.port || '5432'}${url.pathname}`;
  const scope = createHash('sha256').update(target).digest('hex');
  return `clepso-execution-v1:readiness:${scope}`;
}
