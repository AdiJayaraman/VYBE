import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

/** `scrypt` password hash — `salt:derivedKey` hex, no native dependencies. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, derived] = storedHash.split(':');
  if (!salt || !derived) return false;

  try {
    const derivedBuffer = Buffer.from(derived, 'hex');
    const candidate = scryptSync(password, salt, KEY_LENGTH);
    return derivedBuffer.length === candidate.length && timingSafeEqual(derivedBuffer, candidate);
  } catch {
    return false;
  }
}
