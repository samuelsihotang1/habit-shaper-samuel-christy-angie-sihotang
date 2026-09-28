import type { FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { isRefusal, NotFound, ValidationFailed } from '@/lib/errors.ts';

/*
 * Every answer that is not a success leaves in the same envelope. Anything the
 * app did not throw on purpose becomes a flat 500: the database driver's
 * messages carry the query and its values, and none of that belongs in a response.
 */
export default fp(
  async (app) => {
    app.setErrorHandler((error: FastifyError, request, reply) => {
      if (error instanceof ValidationFailed) {
        return reply.status(422).send({
          success: false,
          message: error.message,
          code: error.code,
          errors: error.errors,
          failures: error.failures,
        });
      }

      if (isRefusal(error)) {
        const params = error.params ?? {};
        if (params.retry_after !== undefined) reply.header('Retry-After', String(params.retry_after));
        return reply.status(error.statusCode).send({
          success: false,
          message: error.message,
          code: error.code,
          params,
          ...(error.field ? { errors: { [error.field]: [error.message] } } : {}),
        });
      }

      // Fastify's own refusals: malformed JSON, wrong content type, body too large.
      const status = error.statusCode;
      if (status && status >= 400 && status < 500) {
        return reply.status(status).send({ success: false, message: error.message, code: 'http.badRequest' });
      }

      request.log.error({ err: error }, 'Request failed');
      return reply.status(500).send({ success: false, message: 'Server error.', code: 'http.serverError' });
    });

    app.setNotFoundHandler((_request, reply) => {
      const error = new NotFound();
      return reply.status(404).send({ success: false, message: error.message, code: error.code });
    });
  },
  { name: 'errors' },
);
