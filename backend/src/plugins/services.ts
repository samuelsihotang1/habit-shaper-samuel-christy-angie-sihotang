import fp from 'fastify-plugin';
import { AccountService } from '@/modules/account/service.ts';
import { AuthService } from '@/modules/auth/service.ts';
import { GoalService } from '@/modules/goals/service.ts';
import { HabitService } from '@/modules/habits/service.ts';

/** One instance of each service, over the app's pool: `app.services.habits` and so on. */
export default fp(
  async (app) => {
    const account = new AccountService(app.mysql, app.config);
    app.decorate('services', {
      account,
      auth: new AuthService(app.mysql, app.config, account),
      habits: new HabitService(app.mysql),
      goals: new GoalService(app.mysql),
    });
  },
  { name: 'services', dependencies: ['config', 'mysql'] },
);
