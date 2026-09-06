import { describe, expect, it } from 'bun:test';
import { hashPassword, verifyPassword } from '../utils/password';

const PASSWORD = 'correct horse battery';

describe('hashPassword', () => {
  it('returns the salt and the key as hex, separated by a colon', async () => {
    const [salt, key] = (await hashPassword(PASSWORD)).split(':');

    // 16 salt bytes and a 64 byte key, each byte written as two hex characters
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(key).toMatch(/^[0-9a-f]{128}$/);
  });

  it('never produces the same hash twice for one password', async () => {
    const first = await hashPassword(PASSWORD);
    const second = await hashPassword(PASSWORD);

    // A fresh salt per hash is what keeps two identical passwords from matching
    expect(first).not.toBe(second);
  });
});

describe('verifyPassword', () => {
  it('accepts the password the hash was made from', async () => {
    const stored = await hashPassword(PASSWORD);

    expect(await verifyPassword(PASSWORD, stored)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword(PASSWORD);

    expect(await verifyPassword('wrong password entirely', stored)).toBe(false);
  });

  it('rejects rather than throws on a hash it cannot read', async () => {
    // Whatever ends up in the column, a login attempt has to answer false
    expect(await verifyPassword(PASSWORD, '')).toBe(false);
    expect(await verifyPassword(PASSWORD, 'no-colon-in-here')).toBe(false);
    expect(await verifyPassword(PASSWORD, ':missing-salt')).toBe(false);
    expect(await verifyPassword(PASSWORD, 'missing-key:')).toBe(false);
  });

  it('rejects a stored key of the wrong length without throwing', async () => {
    // timingSafeEqual throws on unequal lengths, so this is checked beforehand
    expect(await verifyPassword(PASSWORD, 'abcdef:0011')).toBe(false);
  });
});
