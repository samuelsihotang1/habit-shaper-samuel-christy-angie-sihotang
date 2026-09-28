import type { Config } from '@/config.ts';
import { transaction, type Database } from '@/db.ts';
import { decrypt, encrypt } from '@/lib/crypto.ts';
import { hashPassword, verifyPassword } from '@/lib/password.ts';
import { BadCode, MfaAlreadyEnabled, MfaNotEnabled, MfaNotStarted, NotFound, WrongCurrentPassword, WrongPassword } from '@/lib/errors.ts';
import { newSecret, secretMatches, splitToken } from '@/lib/tokens.ts';
import { generateSecret, matchCounter, otpauthUrl } from '@/lib/totp.ts';
import { createSessionRepository, type TrustedDevice } from '@/modules/auth/repository.ts';
import { createUserRepository, type User } from '@/modules/users/repository.ts';

const ISSUER = 'Habit Shaper';

export class AccountService {
  private readonly db: Database;
  private readonly config: Config;

  constructor(db: Database, config: Config) {
    this.db = db;
    this.config = config;
  }

  private get users() {
    return createUserRepository(this.db);
  }

  private get sessions() {
    return createSessionRepository(this.db);
  }

  /** A new session token, `<id>|<secret>`. It does not expire (docs/decisions.md). */
  async issueToken(userId: string): Promise<string> {
    const { plain, hash } = newSecret();
    return `${await this.sessions.insertToken(userId, hash)}|${plain}`;
  }

  /** Accept a TOTP code once: its step must be newer than the last one accepted. */
  async consumeCode(user: User, code: string, now = Date.now()): Promise<boolean> {
    if (!user.mfaSecret) return false;
    const secret = decrypt(this.config.appKey, user.mfaSecret);
    if (!secret) return false;

    const counter = matchCounter(secret, code, now);
    if (counter === null) return false;
    return this.users.advanceMfaCounter(user.id, counter);
  }

  async changePassword(user: User, currentTokenId: string, current: string, next: string): Promise<User> {
    if (!(await verifyPassword(current, user.passwordHash))) {
      throw new WrongCurrentPassword();
    }

    // Everyone else signed in as this user is signed out; this browser stays.
    const passwordHash = await hashPassword(next);
    await transaction(this.db, async (tx) => {
      await createUserRepository(tx).update(user.id, { passwordHash });
      await createSessionRepository(tx).deleteTokensOf(user.id, currentTokenId);
    });
    return this.reload(user.id);
  }

  /** Step one: a secret exists but MFA is not on until `confirmMfa` sees a code from it. */
  async startMfa(user: User): Promise<{ secret: string; otpauth_url: string }> {
    if (user.mfaConfirmedAt) throw new MfaAlreadyEnabled();

    const secret = generateSecret();
    await this.users.update(user.id, { mfaSecret: encrypt(this.config.appKey, secret), mfaLastCounter: null });
    return { secret, otpauth_url: otpauthUrl(ISSUER, user.email, secret) };
  }

  async confirmMfa(user: User, code: string): Promise<User> {
    if (user.mfaConfirmedAt) throw new MfaAlreadyEnabled();
    if (!user.mfaSecret) throw new MfaNotStarted();
    if (!(await this.consumeCode(user, code))) throw new BadCode();

    await this.users.update(user.id, { mfaConfirmedAt: new Date() });
    return this.reload(user.id);
  }

  /** Needs both factors: a stolen session alone must not be able to remove the second one. */
  async disableMfa(user: User, password: string, code: string): Promise<User> {
    if (!user.mfaConfirmedAt) throw new MfaNotEnabled();
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new WrongPassword();
    }
    if (!(await this.consumeCode(user, code))) throw new BadCode();

    await transaction(this.db, async (tx) => {
      await createUserRepository(tx).update(user.id, { mfaSecret: null, mfaConfirmedAt: null, mfaLastCounter: null });
      await createSessionRepository(tx).deleteDevicesOf(user.id);
    });
    return this.reload(user.id);
  }

  async trustDevice(userId: string, userAgent: string | undefined): Promise<string> {
    const { plain, hash } = newSecret();
    const id = await this.sessions.insertDevice(userId, hash, (userAgent || 'Unknown browser').slice(0, 255));
    return `${id}|${plain}`;
  }

  async deviceIsTrusted(userId: string, deviceToken: string | undefined): Promise<boolean> {
    const parts = splitToken(deviceToken);
    if (!parts) return false;

    const device = await this.sessions.deviceOf(userId, parts.id);
    if (!device || !secretMatches(parts.secret, device.tokenHash)) return false;

    await this.sessions.touchDevice(device.id);
    return true;
  }

  devices(userId: string): Promise<TrustedDevice[]> {
    return this.sessions.devicesOf(userId);
  }

  /** Scoped by user in the same query: a stranger's id and a missing one are the same 404. */
  async forgetDevice(userId: string, deviceId: string): Promise<void> {
    if ((await this.sessions.deleteDevice(userId, deviceId)) === 0) throw new NotFound();
  }

  async forgetAllDevices(userId: string): Promise<void> {
    await this.sessions.deleteDevicesOf(userId);
  }

  private async reload(id: string): Promise<User> {
    const user = await this.users.byId(id);
    if (!user) throw new NotFound();
    return user;
  }
}
