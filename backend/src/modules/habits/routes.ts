import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import { todayIn } from '@/lib/dates.ts';
import { IdParams, Ok, ok } from '@/lib/http.ts';
import { authOf } from '@/plugins/auth.ts';
import { MINUTE, type Bucket } from '@/plugins/rate-limit.ts';
import { CreateHabitBody, HabitSchema, LogParams, TzQuery, UpdateHabitBody } from '@/modules/habits/schemas.ts';
import { serializeHabit } from '@/modules/habits/serialize.ts';

// Every write of a user's habits shares one bucket.
const writes: Bucket = { name: 'habits-writes', max: 120, windowMs: MINUTE, key: (request) => `habits:${authOf(request).user.id}` };

/** `/api/habits/…`: every read and write is the signed-in user's own; "today" is in the zone `?tz=` names. */
const habitRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const habits = app.services.habits;
  app.addHook('onRequest', app.authenticate);

  const one = { 200: Ok(HabitSchema) };

  app.get('/', { schema: { querystring: TzQuery, response: { 200: Ok(Type.Array(HabitSchema)) } } }, async (request) => {
    const views = await habits.list(authOf(request).user.id, todayIn(request.query.tz));
    return ok(views.map(serializeHabit));
  });

  app.post('/', { config: { limits: [writes] }, schema: { querystring: TzQuery, body: CreateHabitBody, response: { 201: Ok(HabitSchema) } } }, async (request, reply) => {
    const { user } = authOf(request);
    const view = await habits.create(user.id, request.body, todayIn(request.query.tz));
    reply.status(201);
    return ok(serializeHabit(view), 'Habit created.');
  });

  app.get('/:id', { schema: { params: IdParams, querystring: TzQuery, response: one } }, async (request) => {
    return ok(serializeHabit(await habits.get(authOf(request).user.id, request.params.id, todayIn(request.query.tz))));
  });

  app.put('/:id', { config: { limits: [writes] }, schema: { params: IdParams, querystring: TzQuery, body: UpdateHabitBody, response: one } }, async (request) => {
    const { user } = authOf(request);
    const view = await habits.update(user.id, request.params.id, request.body, todayIn(request.query.tz));
    return ok(serializeHabit(view), 'Habit saved.');
  });

  app.delete('/:id', { config: { limits: [writes] }, schema: { params: IdParams, response: { 200: Ok(Type.Null()) } } }, async (request) => {
    const { user } = authOf(request);
    await habits.archive(user.id, request.params.id);
    return ok(null, 'Habit deleted.');
  });

  app.put('/:id/logs/:date', { config: { limits: [writes] }, schema: { params: LogParams, querystring: TzQuery, response: one } }, async (request) => {
    const { user } = authOf(request);
    const { id, date } = request.params;
    return ok(serializeHabit(await habits.setLog(user.id, id, date, true, todayIn(request.query.tz))));
  });

  app.delete('/:id/logs/:date', { config: { limits: [writes] }, schema: { params: LogParams, querystring: TzQuery, response: one } }, async (request) => {
    const { user } = authOf(request);
    const { id, date } = request.params;
    return ok(serializeHabit(await habits.setLog(user.id, id, date, false, todayIn(request.query.tz))));
  });
};

export default habitRoutes;
