import autoload from '@fastify/autoload';
import Fastify, { type FastifyInstance } from 'fastify';
import { join } from 'node:path';
import type { Config } from '@/config.ts';
import { loggerOptions } from '@/lib/logging.ts';
import { ajvOptions, validationFailed } from '@/lib/validation.ts';

export interface BuildOptions {
  config: Config;
  logger?: boolean;
}

/**
 * The whole app, without listening. `server.ts` listens; tests call `inject`.
 * `plugins/` holds what every route shares (autoloaded in the order their
 * `dependencies` ask for); each `modules/<area>/routes.ts` is a plugin mounted
 * at `/api/<area>`, the prefix nginx forwards (deployment.md).
 */
export async function buildApp({ config, logger = true }: BuildOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: logger ? loggerOptions(config.logLevel) : false,
    trustProxy: config.trustProxy,
    // The largest valid body, a goal with 500 characters of notes, is under 1 KiB.
    bodyLimit: 64 * 1024,
    // A request that has not finished in 30 s is dropped rather than held open.
    connectionTimeout: 30_000,
    requestTimeout: 30_000,
    // Route schemas are TypeBox; Ajv validates them and every failure leaves as the 422 envelope.
    ajv: ajvOptions,
    schemaErrorFormatter: (errors) => validationFailed(errors),
  });

  await app.register(autoload, { dir: join(import.meta.dirname, 'plugins'), options: { config } });
  await app.register(
    async (api) => {
      await api.register(autoload, {
        dir: join(import.meta.dirname, 'modules'),
        matchFilter: (path: string) => path.endsWith('/routes.ts'),
      });
    },
    { prefix: '/api' },
  );

  return app;
}
