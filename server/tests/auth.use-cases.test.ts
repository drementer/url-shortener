import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import {
  findCurrentUser,
  login,
  logout,
  refresh,
  register,
} from '../use-cases/auth';
import userRepository from '../repositories/user';
import prisma from '../db/prisma';
import { ConflictError, UnauthorizedError } from '../errors';
import { hashRefreshToken, verifyAccessToken } from '../utils/tokens';
import { resetDatabase } from './helpers';

const EMAIL = 'service@example.com';
const PASSWORD = 'correct horse battery';
const CONTEXT = { userAgent: 'curl/8', ip: '203.0.113.7' };

const registerUser = (email = EMAIL) =>
  register({ email, password: PASSWORD }, CONTEXT);

beforeEach(resetDatabase);

describe('register', () => {
  it('creates the account and hands out a session', async () => {
    const session = await registerUser();

    expect(session.user.email).toBe(EMAIL);
    expect(session.expiresIn).toBeGreaterThan(0);
    expect(verifyAccessToken(session.accessToken)).toEqual({
      sub: session.user.id,
      email: EMAIL,
      role: 'USER',
    });
  });

  it('never stores the password, only a hash of it', async () => {
    await registerUser();

    const stored = await prisma.user.findUnique({ where: { email: EMAIL } });

    expect(stored?.passwordHash).not.toContain(PASSWORD);
    expect(stored?.passwordHash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('stores the refresh token hashed, with the client context', async () => {
    const session = await registerUser();

    const stored = await prisma.session.findUnique({
      where: { refreshTokenHash: hashRefreshToken(session.refreshToken) },
    });

    // A leaked database must not hand anyone a usable refresh token
    expect(stored).not.toBeNull();
    expect(stored?.userAgent).toBe('curl/8');
    expect(stored?.ip).toBe('203.0.113.7');
    expect(stored?.revokedAt).toBeNull();
  });

  it('rejects an email that is already registered', async () => {
    await registerUser();

    await expect(registerUser()).rejects.toThrow(ConflictError);
  });

  it('rejects a duplicate that slipped past the up front check', async () => {
    await registerUser();

    // Two requests for one address can both pass the lookup, so the unique
    // constraint is what decides and the loser has to answer the same conflict
    const lookup = spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

    try {
      await expect(registerUser()).rejects.toThrow(ConflictError);
    } finally {
      lookup.mockRestore();
    }
  });
});

describe('login', () => {
  it('starts a new session for the right password', async () => {
    const registered = await registerUser();

    const session = await login(
      { email: EMAIL, password: PASSWORD },
      CONTEXT,
    );

    expect(session.user.id).toBe(registered.user.id);
    expect(session.refreshToken).not.toBe(registered.refreshToken);
    expect(await prisma.session.count()).toBe(2);
  });

  it('keeps the password hash out of the session it answers with', async () => {
    await registerUser();

    const session = await login(
      { email: EMAIL, password: PASSWORD },
      CONTEXT,
    );

    expect(session.user).not.toHaveProperty('passwordHash');
  });

  it('rejects a wrong password', async () => {
    await registerUser();

    const attempt = login(
      { email: EMAIL, password: 'wrong password entirely' },
      CONTEXT,
    );

    await expect(attempt).rejects.toThrow(UnauthorizedError);
  });

  it('rejects an unknown email without starting a session', async () => {
    const attempt = login(
      { email: 'nobody@example.com', password: PASSWORD },
      CONTEXT,
    );

    await expect(attempt).rejects.toThrow(UnauthorizedError);
    expect(await prisma.session.count()).toBe(0);
  });

  it('verifies a decoy hash when the email is unknown', async () => {
    await registerUser();

    // Both paths hash a password, so the timing cannot be read as an answer
    const known = Bun.nanoseconds();
    await login({ email: EMAIL, password: 'wrong password entirely' }, CONTEXT)
      .catch(() => {});
    const knownCost = Bun.nanoseconds() - known;

    const unknown = Bun.nanoseconds();
    await login({ email: 'nobody@example.com', password: PASSWORD }, CONTEXT)
      .catch(() => {});
    const unknownCost = Bun.nanoseconds() - unknown;

    // Generous on purpose: this asserts the work happens, not how long it takes
    expect(unknownCost).toBeGreaterThan(knownCost / 10);
  });
});

describe('refresh', () => {
  it('hands out a new pair and retires the token it was given', async () => {
    const session = await registerUser();

    const refreshed = await refresh(session.refreshToken, CONTEXT);

    expect(refreshed.refreshToken).not.toBe(session.refreshToken);
    const old = await prisma.session.findUnique({
      where: { refreshTokenHash: hashRefreshToken(session.refreshToken) },
    });
    expect(old?.revokedAt).toBeDate();
  });

  it('ends every session when a retired token comes back', async () => {
    const session = await registerUser();
    await refresh(session.refreshToken, CONTEXT);

    const replay = refresh(session.refreshToken, CONTEXT);

    await expect(replay).rejects.toThrow(UnauthorizedError);
    // A replayed token means it leaked, so the whole chain is dropped
    const live = await prisma.session.count({ where: { revokedAt: null } });
    expect(live).toBe(0);
  });

  it('rejects a token it never issued', async () => {
    const attempt = refresh('a token from nowhere', CONTEXT);

    await expect(attempt).rejects.toThrow(UnauthorizedError);
  });

  it('rejects a session that has run out', async () => {
    const session = await registerUser();
    await prisma.session.update({
      where: { refreshTokenHash: hashRefreshToken(session.refreshToken) },
      data: { expiresAt: new Date('2020-01-01') },
    });

    const attempt = refresh(session.refreshToken, CONTEXT);

    await expect(attempt).rejects.toThrow('Refresh token expired');
  });
});

describe('logout', () => {
  it('ends the session behind the refresh token', async () => {
    const session = await registerUser();

    await logout(session.refreshToken);

    const stored = await prisma.session.findUnique({
      where: { refreshTokenHash: hashRefreshToken(session.refreshToken) },
    });
    expect(stored?.revokedAt).toBeDate();
  });

  it('leaves the other sessions of the account alone', async () => {
    const first = await registerUser();
    await login({ email: EMAIL, password: PASSWORD }, CONTEXT);

    await logout(first.refreshToken);

    expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(1);
  });

  it('says nothing about a token it does not know', async () => {
    // The caller is logged out either way, so an unknown token is not an error
    await expect(
      logout('a token from nowhere'),
    ).resolves.toBeUndefined();
  });

  it('does not move the timestamp of an already retired session', async () => {
    const session = await registerUser();
    await logout(session.refreshToken);
    const hash = hashRefreshToken(session.refreshToken);
    const { revokedAt } = (await prisma.session.findUnique({
      where: { refreshTokenHash: hash },
    }))!;

    await logout(session.refreshToken);

    const after = await prisma.session.findUnique({
      where: { refreshTokenHash: hash },
    });
    expect(after?.revokedAt).toEqual(revokedAt);
  });
});

describe('findCurrentUser', () => {
  it('answers with the account behind the id, hash excluded', async () => {
    const session = await registerUser();

    const user = await findCurrentUser(session.user.id);

    expect(user).toEqual(session.user);
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('answers null for an id it does not know', async () => {
    expect(await findCurrentUser('nobody')).toBeNull();
  });
});
