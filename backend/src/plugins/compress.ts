import compress from '@fastify/compress';
import fp from 'fastify-plugin';

/** gzip or deflate for any answer over 1 KiB, when the client accepts it. */
export default fp(
  async (app) => {
    await app.register(compress, { global: true, threshold: 1024, encodings: ['gzip', 'deflate'] });
  },
  { name: 'compress' },
);
