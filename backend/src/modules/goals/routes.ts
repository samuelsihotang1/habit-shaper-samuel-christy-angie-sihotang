import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import { todayIn } from '@/lib/dates.ts';
import { IdParams, Ok, ok } from '@/lib/http.ts';
import { authOf } from '@/plugins/auth.ts';
import { MINUTE, type Bucket } from '@/plugins/rate-limit.ts';
import { GoalBody, GoalSchema } from '@/modules/goals/schemas.ts';
import { serializeGoal } from '@/modules/goals/serialize.ts';
import { TzQuery } from '@/modules/habits/schemas.ts';

// Every write of a user's goals shares one bucket.
const writes: Bucket = { name: 'goals-writes', max: 120, windowMs: MINUTE, key: (request) => `goals:${authOf(request).user.id}` };

/** `/api/goals/…`: every read and write is the signed-in user's own. */
const goalRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const goals = app.services.goals;
  app.addHook('onRequest', app.authenticate);

  app.get('/', { schema: { querystring: TzQuery, response: { 200: Ok(Type.Array(GoalSchema)) } } }, async (request) => {
    const views = await goals.list(authOf(request).user.id, todayIn(request.query.tz));
    return ok(views.map(serializeGoal));
  });

  app.post('/', { config: { limits: [writes] }, schema: { querystring: TzQuery, body: GoalBody, response: { 201: Ok(GoalSchema) } } }, async (request, reply) => {
    const { user } = authOf(request);
    const view = await goals.create(user.id, request.body, todayIn(request.query.tz));
    reply.status(201);
    return ok(serializeGoal(view), 'Goal added.');
  });

  app.put(
    '/:id',
    { config: { limits: [writes] }, schema: { params: IdParams, querystring: TzQuery, body: GoalBody, response: { 200: Ok(GoalSchema) } } },
    async (request) => {
      const { user } = authOf(request);
      const view = await goals.update(user.id, request.params.id, request.body, todayIn(request.query.tz));
      return ok(serializeGoal(view), 'Goal saved.');
    },
  );

  app.delete('/:id', { config: { limits: [writes] }, schema: { params: IdParams, response: { 200: Ok(Type.Null()) } } }, async (request) => {
    const { user } = authOf(request);
    await goals.remove(user.id, request.params.id);
    return ok(null, 'Goal removed.');
  });
};

export default goalRoutes;
