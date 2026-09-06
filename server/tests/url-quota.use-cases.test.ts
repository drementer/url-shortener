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
});
