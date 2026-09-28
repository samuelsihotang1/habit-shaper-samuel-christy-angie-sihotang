import envSchema from 'env-schema';
import { Type, type Static } from 'typebox';

/*
 * The whole configuration, validated once at start. Every value comes from the
 * environment (backend/.env, loaded by `node --env-file-if-exists`, or compose);
 * none has a secret default (docs/decisions.md).
 */
const Environment = Type.Object({
  APP_KEY: Type.String({ pattern: '\\S' }),
  DATABASE_URL: Type.String({ default: '' }),
  // Empty outside Docker: rate limits then count in this process's memory.
  REDIS_URL: Type.String({ default: '' }),
  PORT: Type.Integer({ minimum: 0, maximum: 65535, default: 3000 }),
  HOST: Type.String({ default: '0.0.0.0' }),
  // loopback + the private ranges: the nginx container reaches us from one.
  TRUST_PROXY: Type.String({ default: 'loopback,uniquelocal' }),
  LOG_LEVEL: Type.Enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'], { default: 'info' }),
});

export interface Config {
  appKey: string;
  databaseUrl: string;
  redisUrl: string;
  port: number;
  host: string;
  /** Passed to Fastify's `trustProxy`: which hops may set X-Forwarded-For. */
  trustProxy: string;
  logLevel: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  let values: Static<typeof Environment>;
  try {
    values = envSchema<Static<typeof Environment>>({ schema: Environment, data: env, env: false, dotenv: false });
  } catch (error) {
    if (!env.APP_KEY?.trim()) {
      throw new Error('APP_KEY is not set. Copy backend/.env.example to backend/.env or see README.md.', { cause: error });
    }
    throw error;
  }

  return {
    appKey: values.APP_KEY.trim(),
    databaseUrl: values.DATABASE_URL,
    redisUrl: values.REDIS_URL,
    port: values.PORT,
    host: values.HOST,
    trustProxy: values.TRUST_PROXY,
    logLevel: values.LOG_LEVEL,
  };
}
