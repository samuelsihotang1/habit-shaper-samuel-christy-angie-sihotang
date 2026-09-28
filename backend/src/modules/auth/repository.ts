import { randomUUID } from 'node:crypto';
import { first, run, select, type Db } from '@/db.ts';
import { USER_COLUMNS, type User } from '@/modules/users/repository.ts';

export interface TrustedDevice {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string;
  lastUsedAt: Date;
  createdAt: Date;
}

const DEVICE_COLUMNS = `id, user_id AS userId, token_hash AS tokenHash, user_agent AS userAgent,
  last_used_at AS lastUsedAt, created_at AS createdAt`;

type TokenWithUser = User & { tokenId: string; tokenHash: string; lastUsedAt: Date };

/** Sessions (access_tokens) and trusted browsers (trusted_devices): both `<id>|<secret>`, hashed at rest. */
export function createSessionRepository(db: Db) {
  return {
    async insertToken(userId: string, tokenHash: string): Promise<string> {
      const id = randomUUID();
      const now = new Date();
      await run(db, 'INSERT INTO access_tokens (id, user_id, token_hash, last_used_at, created_at) VALUES (?, ?, ?, ?, ?)', [
        id, userId, tokenHash, now, now,
      ]);
      return id;
    },

    async tokenWithUser(id: string): Promise<{ user: User; tokenId: string; tokenHash: string; lastUsedAt: Date } | null> {
      const row = await first<TokenWithUser>(
        db,
        `SELECT access_tokens.id AS tokenId, access_tokens.token_hash AS tokenHash, access_tokens.last_used_at AS lastUsedAt, ${USER_COLUMNS}
         FROM access_tokens JOIN users ON users.id = access_tokens.user_id WHERE access_tokens.id = ?`,
        [id],
      );
      if (!row) return null;
      const { tokenId, tokenHash, lastUsedAt, ...user } = row;
      return { user, tokenId, tokenHash, lastUsedAt };
    },

    touchToken: (id: string) => run(db, 'UPDATE access_tokens SET last_used_at = ? WHERE id = ?', [new Date(), id]),

    deleteToken: (id: string) => run(db, 'DELETE FROM access_tokens WHERE id = ?', [id]),

    /** Every session of the user, except `keepId` when given. */
    deleteTokensOf: (userId: string, keepId?: string) =>
      keepId
        ? run(db, 'DELETE FROM access_tokens WHERE user_id = ? AND id <> ?', [userId, keepId])
        : run(db, 'DELETE FROM access_tokens WHERE user_id = ?', [userId]),

    async insertDevice(userId: string, tokenHash: string, userAgent: string): Promise<string> {
      const id = randomUUID();
      const now = new Date();
      await run(db, 'INSERT INTO trusted_devices (id, user_id, token_hash, user_agent, last_used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
        id, userId, tokenHash, userAgent, now, now,
      ]);
      return id;
    },

    /** Scoped by user in the same query: a stranger's id and a missing one are the same null. */
    deviceOf: (userId: string, id: string) =>
      first<TrustedDevice>(db, `SELECT ${DEVICE_COLUMNS} FROM trusted_devices WHERE id = ? AND user_id = ?`, [id, userId]),

    touchDevice: (id: string) => run(db, 'UPDATE trusted_devices SET last_used_at = ? WHERE id = ?', [new Date(), id]),

    devicesOf: (userId: string) =>
      select<TrustedDevice>(db, `SELECT ${DEVICE_COLUMNS} FROM trusted_devices WHERE user_id = ? ORDER BY last_used_at DESC, id`, [userId]),

    deleteDevice: (userId: string, id: string) => run(db, 'DELETE FROM trusted_devices WHERE id = ? AND user_id = ?', [id, userId]),

    deleteDevicesOf: (userId: string) => run(db, 'DELETE FROM trusted_devices WHERE user_id = ?', [userId]),
  };
}
