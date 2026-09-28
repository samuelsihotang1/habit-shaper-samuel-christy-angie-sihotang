import fp from 'fastify-plugin';
import { AccountService } from '@/modules/account/service.ts';
import { AuthService } from '@/modules/auth/service.ts';

/** One instance of each service, over the app's pool: `app.services.auth` and so on. */
export default fp(
  async (app) => {
    const account = new AccountService(app.mysql, app.config);
    app.decorate('services', {
      account,
      auth: new AuthService(app.mysql, app.config, account),
    });
  },
  { name: 'services', dependencies: ['config', 'mysql'] },
);
