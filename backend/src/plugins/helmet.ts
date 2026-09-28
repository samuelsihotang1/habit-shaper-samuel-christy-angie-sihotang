import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';

/**
 * Security headers on every API response. nginx sets X-Frame-Options,
 * X-Content-Type-Options and Referrer-Policy for the whole origin and hides
 * the API's copies of those three (frontend/nginx.conf); the values here match
 * its, so the API answers the same when reached without nginx.
 */
export default fp(
  async (app) => {
    await app.register(helmet, {
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    });
  },
  { name: 'helmet' },
);
