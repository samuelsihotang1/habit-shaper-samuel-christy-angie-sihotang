import rateLimit from '@fastify/rate-limit';
import type { FastifyRequest, onRequestHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import { Throttled } from '@/lib/errors.ts';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

/**
 * One counter a route may spend: at most `max` requests per `windowMs` for
 * each value `key` returns. Key a bucket by what an attacker varies least:
 * email + IP, email, IP, or user id.
 */
export interface Bucket {
  /** Routes naming the same bucket share its counters. */
  name: string;
  max: number;
  windowMs: number;
  key: (request: FastifyRequest) => string;
  /** The key reads the validated body, so the bucket counts after validation. */
  afterValidation?: boolean;
}

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Every bucket this route counts against (`plugins/rate-limit.ts`). */
    limits?: Bucket[];
  }
}

/*
 * @fastify/rate-limit, on Redis when `app.redis` exists. A route lists its
 * buckets in `config.limits`. Buckets that key on the IP or the user count at
 * `preValidation`, so a malformed request still spends one; buckets that key
 * on a body field count at `preHandler`. Every bucket of a stage is counted
 * before any refuses, and the 429 waits for the fullest one.
 *
 * One checker per bucket name: the plugin's own `config.rateLimit` keeps a
 * counter per route, and a bucket such as `account-mfa` spans three routes.
 */
export default fp(
  async (app) => {
    await app.register(rateLimit, {
      global: false,
      nameSpace: 'habit-shaper:limit:',
      ...(app.hasDecorator('redis') ? { redis: app.redis } : { cache: 50_000 }),
    });

    const checkers = new Map<string, ReturnType<typeof app.createRateLimit>>();
    const checkerFor = (bucket: Bucket) => {
      let checker = checkers.get(bucket.name);
      if (!checker) {
        checker = app.createRateLimit({ max: bucket.max, timeWindow: bucket.windowMs, keyGenerator: bucket.key });
        checkers.set(bucket.name, checker);
      }
      return checker;
    };

    const spend = (buckets: Bucket[]): onRequestHookHandler => {
      const checks = buckets.map(checkerFor);
      return async (request) => {
        let retryAfter = 0;
        for (const check of checks) {
          const result = await check(request);
          if (!result.isAllowed && result.isExceeded) retryAfter = Math.max(retryAfter, result.ttlInSeconds);
        }
        if (retryAfter > 0) throw new Throttled(retryAfter);
      };
    };

    app.addHook('onRoute', (route) => {
      const limits = route.config?.limits;
      if (!limits?.length) return;
      for (const [stage, buckets] of [
        ['preValidation', limits.filter((bucket) => !bucket.afterValidation)],
        ['preHandler', limits.filter((bucket) => bucket.afterValidation)],
      ] as const) {
        if (buckets.length === 0) continue;
        const existing = route[stage];
        route[stage] = [...(existing ? [existing].flat() : []), spend(buckets)] as typeof existing;
      }
    });
  },
  { name: 'rate-limit', dependencies: ['redis'] },
);
