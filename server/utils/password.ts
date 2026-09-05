import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Hashes a password with scrypt and returns it as `salt:derivedKey` (both hex).
 * Uses node:crypto only, so it behaves identically under Node and Bun.
 */
export const hashPassword = async (password: string) => {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password: string, storedHash: string) => {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;

  const expected = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  if (expected.length !== derivedKey.length) return false;

  return timingSafeEqual(expected, derivedKey);
};
