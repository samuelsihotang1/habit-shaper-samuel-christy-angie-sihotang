import type { MySQLPromisePool } from '@fastify/mysql';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '@/config.ts';
import type { Limiter } from '@/lib/limiter.ts';
import type { AccountService } from '@/modules/account/service.ts';
import type { AuthService } from '@/modules/auth/service.ts';
import type { GoalService } from '@/modules/goals/service.ts';
import type { HabitService } from '@/modules/habits/service.ts';
import type { User } from '@/modules/users/repository.ts';

// What the plugins in src/plugins/ decorate.
declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    mysql: MySQLPromisePool;
    limiter: Limiter;
    authenticate: (request: FastifyRequest, reply: FastifyReply, done: (error?: Error) => void) => void;
    services: {
      account: AccountService;
      auth: AuthService;
      habits: HabitService;
      goals: GoalService;
    };
  }

  interface FastifyRequest {
    auth: { user: User; tokenId: string } | null;
  }
}
