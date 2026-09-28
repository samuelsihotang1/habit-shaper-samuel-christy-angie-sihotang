import { decrypt, encrypt, sha256 } from '@/lib/crypto.ts';

/*
 * "This user already passed the password", sealed rather than stored: it
 * cannot be forged without APP_KEY, and an unanswered challenge leaves no row
 * behind. `pw` fingerprints the password hash, so a password change kills
 * every challenge issued before it. It is a digest of the whole hash, never a
 * prefix: every argon2 hash here starts with the same `$argon2id$v=19$m=65536,t=3,p=4$`.
 */
export const CHALLENGE_TTL_MS = 5 * 60_000;

interface Payload {
  uid: string;
  at: number;
  pw: string;
}

export function passwordFingerprint(passwordHash: string): string {
  return sha256(passwordHash).slice(0, 16);
}

export function issueChallenge(appKey: string, userId: string, passwordHash: string, now = Date.now()): string {
  const payload: Payload = { uid: userId, at: now, pw: passwordFingerprint(passwordHash) };
  return encrypt(appKey, JSON.stringify(payload));
}

/** The payload of a genuine, unexpired challenge, or null. The fingerprint is the caller's to check. */
export function readChallenge(appKey: string, challenge: string, now = Date.now()): Payload | null {
  const raw = decrypt(appKey, challenge);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as Payload;
    if (typeof payload.uid !== 'string' || typeof payload.at !== 'number') return null;
    if (now - payload.at > CHALLENGE_TTL_MS || payload.at > now + 60_000) return null;
    return payload;
  } catch {
    return null;
  }
}
