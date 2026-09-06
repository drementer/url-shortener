import { describe, expect, it, beforeEach } from 'bun:test';
import { createUrl, deleteUrl } from '../use-cases/url';
import { QuotaExceededError } from '../errors';
import prisma from '../db/prisma';
import { resetDatabase, createUser } from './helpers';

beforeEach(resetDatabase);

describe('active link quota enforcement', () => {
  it('allows a standard USER to create up to 5 active links, then rejects the 6th', async () => {
    const user = await createUser('standard@example.com', 'USER');

    for (let i = 1; i <= 5; i++) {
      const url = await createUrl(
        { url: `https://example.com/page-${i}` },
        user.id,
      );
      expect(url.shortCode).toBeString();
    }

    const sixthAttempt = createUrl(
      { url: 'https://example.com/page-6' },
      user.id,
    );
    await expect(sixthAttempt).rejects.toThrow(QuotaExceededError);
  });

  it('allows an EDITOR user to create up to 10 active links, then rejects the 11th', async () => {
    const editor = await createUser('editor@example.com', 'EDITOR');

    for (let i = 1; i <= 10; i++) {
      const url = await createUrl(
        { url: `https://example.com/editor-page-${i}` },
        editor.id,
      );
      expect(url.shortCode).toBeString();
    }

    const eleventhAttempt = createUrl(
      { url: 'https://example.com/editor-page-11' },
      editor.id,
    );
    await expect(eleventhAttempt).rejects.toThrow(QuotaExceededError);
  });

  it('allows an ADMIN user to create more than 10 links without limit', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');

    for (let i = 1; i <= 12; i++) {
      const url = await createUrl(
        { url: `https://example.com/admin-page-${i}` },
        admin.id,
      );
      expect(url.shortCode).toBeString();
    }

    const count = await prisma.url.count({ where: { userId: admin.id } });
    expect(count).toBe(12);
  });

  it('does not count expired links towards the active link quota', async () => {
    const user = await createUser('expired-tester@example.com', 'USER');

    // Create 5 links that have already expired in the past
    for (let i = 1; i <= 5; i++) {
      await prisma.url.create({
        data: {
          shortCode: `expired-${i}`,
          originalUrl: `https://example.com/expired-${i}`,
          expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          userId: user.id,
        },
      });
    }

    // Since all 5 existing links are expired, creating a new link should succeed
    const freshLink = await createUrl(
      { url: 'https://example.com/fresh-link' },
      user.id,
    );
    expect(freshLink.shortCode).toBeString();
  });

  it('frees up quota immediately when an active link is deleted', async () => {
    const user = await createUser('delete-tester@example.com', 'USER');

    let lastShortCode = '';
    for (let i = 1; i <= 5; i++) {
      const url = await createUrl(
        { url: `https://example.com/link-${i}` },
        user.id,
      );
      lastShortCode = url.shortCode;
    }

    // 6th attempt fails
    await expect(
      createUrl({ url: 'https://example.com/link-6' }, user.id),
    ).rejects.toThrow(QuotaExceededError);

    // Delete one of the 5 active links
    await deleteUrl(lastShortCode, user.id);

    // Now creating a new link must succeed!
    const replacement = await createUrl(
      { url: 'https://example.com/replacement' },
      user.id,
    );
    expect(replacement.shortCode).toBeString();
  });

  it('enforces default 5 quota when a user has no assigned role (role is null)', async () => {
    const user = await createUser('norole@example.com', 'USER');
    await prisma.user.update({ where: { id: user.id }, data: { roleId: null } });

    for (let i = 1; i <= 5; i++) {
      const url = await createUrl(
        { url: `https://example.com/no-role-${i}` },
        user.id,
      );
      expect(url.shortCode).toBeString();
    }

    const sixthAttempt = createUrl(
      { url: 'https://example.com/no-role-6' },
      user.id,
    );
    await expect(sixthAttempt).rejects.toThrow(QuotaExceededError);
  });

  it('prevents quota race condition during concurrent link creations', async () => {
    const user = await createUser('race-tester@example.com', 'USER');

    // Create 4 active links so only 1 slot remains under the quota of 5
    for (let i = 1; i <= 4; i++) {
      await createUrl({ url: `https://example.com/race-slot-${i}` }, user.id);
    }

    // Fire 2 creations concurrently
    const results = await Promise.allSettled([
      createUrl({ url: 'https://example.com/race-candidate-1' }, user.id),
      createUrl({ url: 'https://example.com/race-candidate-2' }, user.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      QuotaExceededError,
    );

    const totalCount = await prisma.url.count({ where: { userId: user.id } });
    expect(totalCount).toBe(5);
  });
});
