import closeWithGrace from 'close-with-grace';
import { buildApp } from '@/app.ts';
import { loadConfig } from '@/config.ts';

const config = loadConfig();
const app = await buildApp({ config });

// On SIGINT/SIGTERM, or an uncaught error, requests in flight get 10 s to finish
// before the process exits anyway; a second signal exits at once.
closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
  if (err) app.log.error({ err }, 'Closing after an uncaught error');
  else app.log.info({ signal }, 'Closing');
  await app.close();
});

await app.listen({ port: config.port, host: config.host });
