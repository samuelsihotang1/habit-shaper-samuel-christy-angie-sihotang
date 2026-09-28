import redis from '@fastify/redis';
import fp from 'fastify-plugin';

/**
 * `app.redis`, only when REDIS_URL is set (Docker). Rate-limit counters live
 * there so they survive a backend restart and are shared by every replica.
 * Without it the rate-limit plugin counts in memory.
 */
export default fp(
  async (app) => {
    if (app.config.redisUrl) await app.register(redis, { url: app.config.redisUrl });
  },
  { name: 'redis', dependencies: ['config'] },
);
