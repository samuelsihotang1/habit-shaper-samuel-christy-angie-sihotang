import type { Config } from '@/config.ts';
import { isDuplicate, transaction, type Database } from '@/db.ts';
import { issueChallenge, passwordFingerprint, readChallenge } from '@/lib/challenge.ts';
import { DUMMY_HASH, hashPassword, verifyPassword } from '@/lib/password.ts';
import { BadCode, ChallengeExpired, EmailTaken, InvalidCredentials, ResetNeedsMfa } from '@/lib/errors.ts';
import type { AccountService } from '@/modules/account/service.ts';
import { createSessionRepository } from '@/modules/auth/repository.ts';
import { createUserRepository, type User } from '@/modules/users/repository.ts';
import { serializeUser } from '@/modules/users/serialize.ts';

export type Session = { user: ReturnType<typeof serializeUser>; token: string; device_token?: string };
export type MfaChallenge = { mfa_required: true; challenge: string };

export class AuthService {
  private readonly db: Database;
  private readonly config: Config;
  private readonly account: AccountService;

  constructor(db: Database, config: Config, account: AccountService) {
    this.db = db;
    this.config = config;
    this.account = account;
  }

  private get users() {
    return createUserRepository(this.db);
  }

  /**
   * Which second screen /login shows. This tells a caller whether an address
   * is registered; accepted, because the form cannot choose its next step
   * otherwise (docs/security.md §2).
   */
  async identify(email: string): Promise<{ exists: boolean }> {
    return { exists: (await this.users.byEmail(email)) !== null };
  }

  async register(data: { name: string; email: string; password: string }): Promise<Session> {
    try {
      const user = await this.users.insert({ name: data.name, email: data.email, passwordHash: await hashPassword(data.password) });
      return this.session(user);
    } catch (error) {
      // The unique index is the real check; a lookup first would still race.
      if (isDuplicate(error)) throw new EmailTaken();
      throw error;
    }
  }

  /**
   * A correct password is a session only when the account has no second
   * factor, or this browser was trusted with it. Otherwise the answer is a
   * challenge and no token: nothing is signed in until `verifyMfa`.
   */
  async login(data: { email: string; password: string; device_token?: string }): Promise<Session | MfaChallenge> {
    const user = await this.users.byEmail(data.email);
    const valid = await verifyPassword(data.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new InvalidCredentials();

    if (user.mfaConfirmedAt && !(await this.account.deviceIsTrusted(user.id, data.device_token))) {
      return { mfa_required: true, challenge: issueChallenge(this.config.appKey, user.id, user.passwordHash) };
    }
    return this.session(user);
  }

  async verifyMfa(
    data: { challenge: string; code: string; trust_device?: boolean },
    userAgent: string | undefined,
  ): Promise<Session> {
    const payload = readChallenge(this.config.appKey, data.challenge);
    const user = payload ? await this.users.byId(payload.uid) : null;

    if (!payload || !user || !user.mfaConfirmedAt || payload.pw !== passwordFingerprint(user.passwordHash)) {
      throw new ChallengeExpired();
    }
    if (!(await this.account.consumeCode(user, data.code))) throw new BadCode();

    const session = await this.session(user);
    if (data.trust_device) session.device_token = await this.account.trustDevice(user.id, userAgent);
    return session;
  }

  /**
   * Reset proves identity with the authenticator instead of an inbox, so it
   * exists only for accounts with MFA on. Every session and trusted device is
   * dropped: whoever made the reset necessary may still hold one.
   */
  async resetPassword(data: { email: string; code: string; password: string }): Promise<void> {
    const user = await this.users.byEmail(data.email);
    if (!user || !user.mfaConfirmedAt) {
      throw new ResetNeedsMfa();
    }
    if (!(await this.account.consumeCode(user, data.code))) throw new BadCode();

    const passwordHash = await hashPassword(data.password);
    await transaction(this.db, async (tx) => {
      await createUserRepository(tx).update(user.id, { passwordHash });
      const sessions = createSessionRepository(tx);
      await sessions.deleteTokensOf(user.id);
      await sessions.deleteDevicesOf(user.id);
    });
  }

  async logout(tokenId: string): Promise<void> {
    await createSessionRepository(this.db).deleteToken(tokenId);
  }

  private async session(user: User): Promise<Session> {
    return { user: serializeUser(user), token: await this.account.issueToken(user.id) };
  }
}
