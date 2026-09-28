import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import { Ok, ok } from '@/lib/http.ts';

/** `/api/health`: the compose healthcheck. It answers only while the database does. */
const healthRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // Silent: compose polls it every few seconds.
  app.get('/', { logLevel: 'silent', schema: { response: { 200: Ok(Type.Object({ status: Type.String() })) } } }, async () => {
    await app.mysql.query('SELECT 1');
    return ok({ status: 'ok' });
  });
};

export default healthRoutes;
