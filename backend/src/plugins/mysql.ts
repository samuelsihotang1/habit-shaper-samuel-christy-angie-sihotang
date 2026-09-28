import mysql from '@fastify/mysql';
import fp from 'fastify-plugin';
import { poolOptions } from '@/db.ts';

/** `app.mysql`: one promise pool for the process, closed when the app closes. */
export default fp(
  async (app) => {
    await app.register(mysql, { promise: true, ...poolOptions(app.config.databaseUrl) });
  },
  { name: 'mysql', dependencies: ['config'] },
);
