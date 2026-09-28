import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { todayIn } from '@/lib/dates.ts';
import { Ok, ok } from '@/lib/http.ts';
import { authOf } from '@/plugins/auth.ts';
import { StatsQuery, StatsSchema } from '@/modules/stats/schemas.ts';
import { serializeStats } from '@/modules/stats/serialize.ts';

/** `/api/stats`: the signed-in user's habits added up per bucket. */
const statsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const stats = app.services.stats;
  app.addHook('onRequest', app.authenticate);

  app.get('/', { schema: { querystring: StatsQuery, response: { 200: Ok(StatsSchema) } } }, async (request) => {
    const { tz, period } = request.query;
    return ok(serializeStats(await stats.summary(authOf(request).user.id, period, todayIn(tz))));
  });
};

export default statsRoutes;
