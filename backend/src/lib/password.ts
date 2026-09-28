import { hash, verify } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';

/*
 * argon2id, the library's default algorithm, with the Fastify skill's
 * parameters (authentication.md): 64 MiB, 3 passes, 4 lanes. The stored string
 * is PHC format (`$argon2id$v=19$m=65536,t=3,p=4$salt$hash`), so the
 * parameters can change without a migration: `verify` reads them from it.
 */
const PARAMS = { memoryCost: 65_536, timeCost: 3, parallelism: 4 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, PARAMS);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    // A string that is not a PHC hash matches no password.
    return false;
  }
}

/*
 * A hash that is valid but matches no password, verified when the email is
 * unknown so that a miss costs the same time as a wrong password.
 */
export const DUMMY_HASH = await hashPassword(randomBytes(32).toString('base64'));
