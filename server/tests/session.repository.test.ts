import { describe, expect, it, beforeEach } from 'bun:test';
import sessionRepository from '../repositories/session';
import prisma from '../db/prisma';
import { resetDatabase, createUser } from './helpers';

let userId: string;
let otherUserId: string;

const HOUR_IN_MS = 60 * 60 * 1000;

const newSession = (refreshTokenHash: string, owner = userId) => ({
  userId: owner,
  refreshTokenHash,
  expiresAt: new Date(Date.now() + HOUR_IN_MS),
});

beforeEach(async () => {
  await resetDatabase();
  userId = (await createUser('session-owner@example.com')).id;
  otherUserId = (await createUser('session-other@example.com')).id;
});

describe('sessionRepository.create', () => {
  it('stores a live session', async () => {
    const session = await sessionRepository.create({
      ...newSession('hash-1'),
      userAgent: 'curl/8',
      ip: '203.0.113.7',
    });

    expect(session.userId).toBe(userId);
    expect(session.revokedAt).toBeNull();
    expect(session.expiresAt).toBeDate();
  });
});

describe('sessionRepository.findByTokenHash', () => {
  it('finds the session behind a token hash', async () => {
    const created = await sessionRepository.create(newSession('hash-1'));

    const found = await sessionRepository.findByTokenHash('hash-1');

    expect(found?.id).toBe(created.id);
  });

  it('answers null for a hash it never issued', async () => {
    expect(await sessionRepository.findByTokenHash('unknown')).toBeNull();
  });

  it('still finds a revoked session', async () => {
    const created = await sessionRepository.create(newSession('hash-1'));
    await sessionRepository.revoke(created.id);

    // The service needs to see it: a replayed token means the token leaked
    const found = await sessionRepository.findByTokenHash('hash-1');

    expect(found?.revokedAt).toBeDate();
  });
});

describe('sessionRepository.revoke', () => {
  it('retires a live session and reports the one row', async () => {
    const created = await sessionRepository.create(newSession('hash-1'));

    expect(await sessionRepository.revoke(created.id)).toBe(1);
  });

  it('reports zero rows the second time around', async () => {
    const created = await sessionRepository.create(newSession('hash-1'));
    await sessionRepository.revoke(created.id);

    // Of two requests holding the same token, only one can consume it
    expect(await sessionRepository.revoke(created.id)).toBe(0);
  });

  it('keeps the first revocation timestamp', async () => {
    const created = await sessionRepository.create(newSession('hash-1'));
    await sessionRepository.revoke(created.id);
    const { revokedAt } = (await sessionRepository.findByTokenHash('hash-1'))!;

    await sessionRepository.revoke(created.id);

    const after = await sessionRepository.findByTokenHash('hash-1');
    expect(after!.revokedAt).toEqual(revokedAt);
  });

  it('reports zero rows for an id it does not know', async () => {
    expect(await sessionRepository.revoke('nothing-here')).toBe(0);
  });
});

describe('sessionRepository.revokeAllForUser', () => {
  it('ends every live session of one account', async () => {
    await sessionRepository.create(newSession('hash-1'));
    await sessionRepository.create(newSession('hash-2'));

    await sessionRepository.revokeAllForUser(userId);

    const live = await prisma.session.count({
      where: { userId, revokedAt: null },
    });
    expect(live).toBe(0);
  });

  it('leaves the sessions of other accounts alone', async () => {
    await sessionRepository.create(newSession('hash-1'));
    await sessionRepository.create(newSession('hash-2', otherUserId));

    await sessionRepository.revokeAllForUser(userId);

    const live = await prisma.session.count({
      where: { userId: otherUserId, revokedAt: null },
    });
    expect(live).toBe(1);
  });

  it('does nothing for an account with no live session', async () => {
    await expect(
      sessionRepository.revokeAllForUser(userId),
    ).resolves.toBeDefined();
  });
});

describe('sessionRepository.rotate', () => {
  it('retires the old session and stores the new one in one atomic step', async () => {
    const old = await sessionRepository.create(newSession('hash-1'));
    const replacement = newSession('hash-2');

    const rotated = await sessionRepository.rotate(old.id, userId, replacement);

    expect(rotated).not.toBeNull();
    expect(rotated?.userId).toBe(userId);
    expect(rotated?.revokedAt).toBeNull();

    const storedOld = await sessionRepository.findByTokenHash('hash-1');
    expect(storedOld?.revokedAt).toBeDate();
  });

  it('revokes all sessions for the user and answers null when the old session was already retired', async () => {
    const old = await sessionRepository.create(newSession('hash-1'));
    await sessionRepository.revoke(old.id);
    await sessionRepository.create(newSession('hash-other'));

    const rotated = await sessionRepository.rotate(
      old.id,
      userId,
      newSession('hash-2'),
    );

    expect(rotated).toBeNull();
    const live = await prisma.session.count({
      where: { userId, revokedAt: null },
    });
    expect(live).toBe(0);
  });

  it('revokes all sessions for the user and answers null when the session id is unknown', async () => {
    await sessionRepository.create(newSession('hash-1'));

    const rotated = await sessionRepository.rotate(
      'unknown-session-id',
      userId,
      newSession('hash-2'),
    );

    expect(rotated).toBeNull();
    const live = await prisma.session.count({
      where: { userId, revokedAt: null },
    });
    expect(live).toBe(0);
  });

  it('leaves the sessions of other accounts alone on replay', async () => {
    const old = await sessionRepository.create(newSession('hash-1'));
    await sessionRepository.revoke(old.id);
    await sessionRepository.create(newSession('hash-other', otherUserId));

    const rotated = await sessionRepository.rotate(
      old.id,
      userId,
      newSession('hash-2'),
    );

    expect(rotated).toBeNull();
    const otherLive = await prisma.session.count({
      where: { userId: otherUserId, revokedAt: null },
    });
    expect(otherLive).toBe(1);
  });
});
