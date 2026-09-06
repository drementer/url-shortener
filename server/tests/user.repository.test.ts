import { describe, expect, it, beforeEach } from 'bun:test';
import userRepository from '../repositories/user';
import { UniqueConstraintError } from '../errors';
import { resetDatabase } from './helpers';

const EMAIL = 'user@example.com';
const HASH = 'salt:derivedkey';

beforeEach(resetDatabase);

describe('userRepository.create', () => {
  it('answers with the public fields only', async () => {
    const user = await userRepository.create({
      email: EMAIL,
      passwordHash: HASH,
    });

    // Selected explicitly, so the hash cannot ride along into a response
    expect(Object.keys(user).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'role',
      'roleId',
    ]);
    expect(user.email).toBe(EMAIL);
  });

  it('reports a taken email as a domain error', async () => {
    await userRepository.create({ email: EMAIL, passwordHash: HASH });

    // Prisma's own code is translated here, so no use case has to know it
    const attempt = userRepository.create({ email: EMAIL, passwordHash: HASH });

    await expect(attempt).rejects.toThrow(UniqueConstraintError);
  });
});

describe('userRepository.findById', () => {
  it('finds the account and hides the hash', async () => {
    const created = await userRepository.create({
      email: EMAIL,
      passwordHash: HASH,
    });

    const found = await userRepository.findById(created.id);

    expect(found).toEqual(created);
    expect(found).not.toHaveProperty('passwordHash');
  });

  it('answers null for an id it does not know', async () => {
    expect(await userRepository.findById('nobody')).toBeNull();
  });
});

describe('userRepository.findByEmail', () => {
  it('finds the account and hides the hash', async () => {
    await userRepository.create({ email: EMAIL, passwordHash: HASH });

    const found = await userRepository.findByEmail(EMAIL);

    expect(found?.email).toBe(EMAIL);
    expect(found).not.toHaveProperty('passwordHash');
  });

  it('matches the stored address exactly', async () => {
    await userRepository.create({ email: EMAIL, passwordHash: HASH });

    // Lowercasing happens in the validator, the lookup itself is literal
    expect(await userRepository.findByEmail('USER@EXAMPLE.COM')).toBeNull();
  });

  it('answers null for an address nobody registered', async () => {
    expect(await userRepository.findByEmail('nobody@example.com')).toBeNull();
  });
});

describe('userRepository.findByEmailWithPassword', () => {
  it('carries the hash, for verifying a login attempt', async () => {
    await userRepository.create({ email: EMAIL, passwordHash: HASH });

    const found = await userRepository.findByEmailWithPassword(EMAIL);

    expect(found?.passwordHash).toBe(HASH);
    expect(Object.keys(found!).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'passwordHash',
      'role',
      'roleId',
    ]);
  });

  it('answers null for an address nobody registered', async () => {
    expect(
      await userRepository.findByEmailWithPassword('nobody@example.com'),
    ).toBeNull();
  });
});
