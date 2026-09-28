import fp from 'fastify-plugin';
import type { Config } from '@/config.ts';

/** The validated settings `buildApp` was given (`loadConfig`), for every plugin after this one. */
export default fp<{ config: Config }>(
  async (app, { config }) => {
    app.decorate('config', config);
  },
  { name: 'config' },
);
