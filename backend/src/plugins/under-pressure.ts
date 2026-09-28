import underPressure, { type FastifyUnderPressureOptions } from '@fastify/under-pressure';
import fp from 'fastify-plugin';
import { Unavailable } from '@/lib/errors.ts';

const RETRY_AFTER_SECONDS = 10;

/**
 * Load shedding: while the event loop lags or memory runs high, every request
 * is refused with 503 `http.unavailable` instead of queueing behind the rest.
 * The thresholds are the Fastify skill's (performance.md); a test passes its own.
 */
export default fp<{ thresholds?: Partial<FastifyUnderPressureOptions> }>(
  async (app, options) => {
    await app.register(underPressure, {
      maxEventLoopDelay: 1000,
      maxEventLoopUtilization: 0.98,
      maxHeapUsedBytes: 1_000_000_000,
      maxRssBytes: 1_500_000_000,
      ...options.thresholds,
      pressureHandler: async () => {
        throw new Unavailable(RETRY_AFTER_SECONDS);
      },
    });
  },
  { name: 'under-pressure' },
);
