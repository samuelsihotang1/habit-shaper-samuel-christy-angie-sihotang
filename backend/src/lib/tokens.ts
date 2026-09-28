import { randomBytes } from 'node:crypto';
import { safeEqual, sha256 } from '@/lib/crypto.ts';

/*
 * Opaque tokens in Sanctum's shape: `<row id>|<secret>`. The row stores only
 * sha256(secret), so a leaked database holds no usable session. The id prefix
 * makes lookup one primary-key read instead of a scan over hashes.
 */
export function newSecret(): { plain: string; hash: string } {
  const plain = randomBytes(30).toString('base64url');
  return { plain, hash: sha256(plain) };
}

export function splitToken(token: string | undefined | null): { id: string; secret: string } | null {
  if (!token) return null;
  const at = token.indexOf('|');
  if (at <= 0 || at === token.length - 1) return null;
  return { id: token.slice(0, at), secret: token.slice(at + 1) };
}

export function secretMatches(secret: string, storedHash: string): boolean {
  return safeEqual(sha256(secret), storedHash);
}
