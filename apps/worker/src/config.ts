export function workerConfig(env: NodeJS.ProcessEnv) {
  if (!env.DATABASE_URL || !env.REDIS_URL)
    throw new Error('DATABASE_URL and REDIS_URL are required');
  let database: URL, redis: URL;
  try {
    database = new URL(env.DATABASE_URL);
    redis = new URL(env.REDIS_URL);
  } catch {
    throw new Error('Invalid worker connection URL');
  }
  if (
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    !['redis:', 'rediss:'].includes(redis.protocol)
  )
    throw new Error('Invalid worker connection protocol');
  return { databaseUrl: env.DATABASE_URL, redisUrl: env.REDIS_URL };
}
