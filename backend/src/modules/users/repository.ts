import { randomUUID } from 'node:crypto';
import { first, run, type Db } from '@/db.ts';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  mfaSecret: string | null;
  mfaConfirmedAt: Date | null;
  mfaLastCounter: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const USER_COLUMNS = `users.id, users.name, users.email, users.password_hash AS passwordHash,
  users.mfa_secret AS mfaSecret, users.mfa_confirmed_at AS mfaConfirmedAt, users.mfa_last_counter AS mfaLastCounter,
  users.created_at AS createdAt, users.updated_at AS updatedAt`;

type Changes = Partial<Pick<User, 'passwordHash' | 'mfaSecret' | 'mfaConfirmedAt' | 'mfaLastCounter'>>;

const COLUMN: Record<keyof Changes, string> = {
  passwordHash: 'password_hash',
  mfaSecret: 'mfa_secret',
  mfaConfirmedAt: 'mfa_confirmed_at',
  mfaLastCounter: 'mfa_last_counter',
};

export function createUserRepository(db: Db) {
  return {
    byEmail: (email: string) => first<User>(db, `SELECT ${USER_COLUMNS} FROM users WHERE email = ?`, [email]),

    byId: (id: string) => first<User>(db, `SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]),

    /** Throws MySQL's duplicate-key error when the email is taken (`isDuplicate`). */
    async insert(data: Pick<User, 'name' | 'email' | 'passwordHash'>): Promise<User> {
      const now = new Date();
      const user: User = { id: randomUUID(), ...data, mfaSecret: null, mfaConfirmedAt: null, mfaLastCounter: null, createdAt: now, updatedAt: now };
      await run(db, 'INSERT INTO users (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
        user.id, user.name, user.email, user.passwordHash, now, now,
      ]);
      return user;
    },

    async update(id: string, changes: Changes): Promise<void> {
      const fields = Object.entries(changes) as [keyof Changes, unknown][];
      const set = fields.map(([field]) => `${COLUMN[field]} = ?`).join(', ');
      await run(db, `UPDATE users SET ${set}, updated_at = ? WHERE id = ?`, [...fields.map(([, value]) => value), new Date(), id]);
    },

    /**
     * Records `counter` as the last accepted TOTP step only if it is newer, in
     * the statement that checks it, so two requests racing with one code cannot
     * both pass. Answers whether it was recorded.
     */
    async advanceMfaCounter(id: string, counter: number): Promise<boolean> {
      const changed = await run(
        db,
        'UPDATE users SET mfa_last_counter = ?, updated_at = ? WHERE id = ? AND (mfa_last_counter IS NULL OR mfa_last_counter < ?)',
        [counter, new Date(), id, counter],
      );
      return changed === 1;
    },
  };
}
