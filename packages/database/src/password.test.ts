import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password helpers', () => {
  it('produces a salted hash that verifies', () => {
    const hash = hashPassword('vybe1234');
    expect(hash).toContain(':');
    expect(hash).not.toContain('vybe1234');
    expect(verifyPassword('vybe1234', hash)).toBe(true);
  });

  it('salts every hash', () => {
    expect(hashPassword('same-password')).not.toEqual(hashPassword('same-password'));
  });

  it('rejects the wrong password and malformed hashes', () => {
    const hash = hashPassword('correct-horse');
    expect(verifyPassword('wrong-horse', hash)).toBe(false);
    expect(verifyPassword('correct-horse', 'not-a-hash')).toBe(false);
    expect(verifyPassword('correct-horse', '')).toBe(false);
  });
});
