import bearerAuth from '@fastify/bearer-auth';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { Unauthenticated } from '@/lib/errors.ts';
import { secretMatches, splitToken } from '@/lib/tokens.ts';
import { createSessionRepository } from '@/modules/auth/repository.ts';

// A write per request would be a write per request; a minute of precision is plenty for "last used".
const TOUCH_AFTER_MS = 60_000;

/**
 * The only gate. Route guards in the SPA are a UX hint; this is what decides.
 * `app.authenticate` is an `onRequest` hook, so a request without a session is
 * refused before its body is read. It sets `request.auth`, which every
 * authenticated handler reads its user from.
 */
export default fp(
  async (app) => {
    app.decorateRequest('auth', null);

    // addHook false: each protected scope adds the hook itself, and a failed
    // lookup reaches the error handler (and the log) instead of a bare 500.
    await app.register(bearerAuth, {
      addHook: false,
      keys: [],
      verifyErrorLogLevel: 'debug',
      async auth(key, request) {
        const parts = splitToken(key);
        if (!parts) return false;

        const sessions = createSessionRepository(app.mysql);
        const token = await sessions.tokenWithUser(parts.id);
        if (!token || !secretMatches(parts.secret, token.tokenHash)) return false;

        if (Date.now() - token.lastUsedAt.getTime() > TOUCH_AFTER_MS) await sessions.touchToken(token.tokenId);
        request.auth = { user: token.user, tokenId: token.tokenId };
        return true;
      },
    });

    const verify = app.verifyBearerAuth!;
    app.decorate('authenticate', (request: FastifyRequest, reply: FastifyReply, done: (error?: Error) => void) => {
      verify(request, reply, (error) => done((error as { statusCode?: number } | undefined)?.statusCode === 401 ? new Unauthenticated() : error));
    });
  },
  { name: 'auth', dependencies: ['mysql'] },
);

/** For handlers behind `authenticate`, where `request.auth` is always set. */
export function authOf(request: Pick<FastifyRequest, 'auth'>) {
  if (!request.auth) throw new Unauthenticated();
  return request.auth;
}
