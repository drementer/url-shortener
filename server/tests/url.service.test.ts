import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import urlService from '../services/url';
import urlRepository from '../repositories/url';
import prisma from '../db/prisma';
import { ConflictError } from '../errors';

let ownerId: string;

const resetDatabase = async () => {
  await prisma.click.deleteMany();
  await prisma.url.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // Links are owned, so the service needs someone to create them for
  const owner = await prisma.user.create({
    data: { email: 'owner@example.com', passwordHash: 'unused-in-this-suite' },
  });

  ownerId = owner.id;
};

describe('urlService.create', () => {
  beforeEach(resetDatabase);

  it('generates a short code when no custom slug is given', async () => {
    const url = await urlService.create(
      { url: 'https://example.com' },
      ownerId,
    );

    expect(url.shortCode).toHaveLength(6);
    expect(url.customSlug).toBeNull();
    expect(url.expiresAt).toBeNull();
  });

  it('stores a custom slug as both the short code and the slug', async () => {
    const url = await urlService.create(
      { url: 'https://example.com', customSlug: 'my-slug' },
      ownerId,
    );

    expect(url.shortCode).toBe('my-slug');
    expect(url.customSlug).toBe('my-slug');
  });

  it('rejects a custom slug that is already taken', async () => {
    await urlService.create(
      { url: 'https://example.com', customSlug: 'taken' },
      ownerId,
    );

    const attempt = urlService.create(
      { url: 'https://other.com', customSlug: 'taken' },
      ownerId,
    );

    await expect(attempt).rejects.toThrow(ConflictError);
  });

  it('turns expiresIn hours into an absolute date', async () => {
    const before = Date.now();
    const url = await urlService.create(
      { url: 'https://example.com', expiresIn: 2 },
      ownerId,
    );

    const diffHours = (url.expiresAt!.getTime() - before) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(1.9);
    expect(diffHours).toBeLessThan(2.1);
  });
});

describe('urlService.resolveRedirect', () => {
  beforeEach(resetDatabase);

  it('records a click and returns the target for a live link', async () => {
    const created = await urlService.create(
      { url: 'https://example.com' },
      ownerId,
    );

    const result = await urlService.resolveRedirect(created.shortCode, {
      ip: '127.0.0.1',
    });

    expect(result.status).toBe('active');
    expect(result.url?.originalUrl).toBe('https://example.com');
    expect(await prisma.click.count({ where: { urlId: created.id } })).toBe(1);
  });

  it('reports an expired link without recording the click', async () => {
    const created = await urlService.create(
      { url: 'https://example.com', expiresIn: 1 },
      ownerId,
    );
    await prisma.url.update({
      where: { id: created.id },
      data: { expiresAt: new Date('2020-01-01') },
    });

    const result = await urlService.resolveRedirect(created.shortCode, {});

    expect(result.status).toBe('expired');
    expect(await prisma.click.count({ where: { urlId: created.id } })).toBe(0);
  });

  it('reports an unknown code as not found', async () => {
    const result = await urlService.resolveRedirect('nothing-here', {});

    expect(result.status).toBe('not_found');
    expect(result.url).toBeNull();
  });
});

describe('urlService.delete', () => {
  beforeEach(resetDatabase);

  it('returns true when a row was removed', async () => {
    const created = await urlService.create(
      { url: 'https://example.com' },
      ownerId,
    );

    expect(await urlService.delete(created.shortCode, ownerId)).toBe(true);
  });

  it('returns false for an unknown code instead of throwing', async () => {
    expect(await urlService.delete('nothing-here', ownerId)).toBe(false);
  });
});

describe('urlService.getStats', () => {
  beforeEach(resetDatabase);

  it('returns null for an unknown code', async () => {
    expect(await urlService.getStats('nothing-here', ownerId)).toBeNull();
  });

  it('returns the click events of a known code', async () => {
    const created = await urlService.create(
      { url: 'https://example.com' },
      ownerId,
    );
    await urlService.resolveRedirect(created.shortCode, {});

    const stats = await urlService.getStats(created.shortCode, ownerId);

    expect(stats?.clickEvents).toHaveLength(1);
  });
});

describe('urlService.create retries', () => {
  beforeEach(resetDatabase);

  const uniqueViolation = { code: 'P2002' };

  it('generates another code when the first one is taken', async () => {
    const create = spyOn(urlRepository, 'create');
    create.mockImplementationOnce(() => Promise.reject(uniqueViolation));

    try {
      const url = await urlService.create(
        { url: 'https://example.com' },
        ownerId,
      );

      // A collision between two generated codes is retried, not reported
      expect(url.shortCode).toHaveLength(6);
      expect(create).toHaveBeenCalledTimes(2);
    } finally {
      create.mockRestore();
    }
  });

  it('gives up after five collisions in a row', async () => {
    const create = spyOn(urlRepository, 'create').mockImplementation(() =>
      Promise.reject(uniqueViolation),
    );

    try {
      const attempt = urlService.create(
        { url: 'https://example.com' },
        ownerId,
      );

      await expect(attempt).rejects.toThrow(
        'Could not generate a unique short code',
      );
      expect(create).toHaveBeenCalledTimes(5);
    } finally {
      create.mockRestore();
    }
  });

  it('does not retry a custom slug, which would reuse the value', async () => {
    const create = spyOn(urlRepository, 'create').mockImplementation(() =>
      Promise.reject(uniqueViolation),
    );

    try {
      const attempt = urlService.create(
        { url: 'https://example.com', customSlug: 'racing-slug' },
        ownerId,
      );

      await expect(attempt).rejects.toThrow(ConflictError);
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      create.mockRestore();
    }
  });

  it('lets a failure that is not a collision through untouched', async () => {
    const create = spyOn(urlRepository, 'create').mockImplementation(() =>
      Promise.reject(new Error('database is gone')),
    );

    try {
      const attempt = urlService.create(
        { url: 'https://example.com' },
        ownerId,
      );

      await expect(attempt).rejects.toThrow('database is gone');
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      create.mockRestore();
    }
  });
});

describe('urlService.findAll', () => {
  beforeEach(resetDatabase);

  it('lists only the links of the owner, with their click counts', async () => {
    const stranger = await prisma.user.create({
      data: { email: 'stranger@example.com', passwordHash: 'unused' },
    });
    const mine = await urlService.create(
      { url: 'https://example.com' },
      ownerId,
    );
    await urlService.create({ url: 'https://other.com' }, stranger.id);
    await urlService.resolveRedirect(mine.shortCode, {});

    const urls = await urlService.findAll(ownerId);

    expect(urls).toHaveLength(1);
    expect(urls[0].shortCode).toBe(mine.shortCode);
    expect(urls[0].clickCount).toBe(1);
  });

  it('answers with an empty list for an owner with no links', async () => {
    expect(await urlService.findAll(ownerId)).toEqual([]);
  });
});

describe('link ownership', () => {
  beforeEach(resetDatabase);

  it('hides the statistics and removal of a link it does not own', async () => {
    const stranger = await prisma.user.create({
      data: { email: 'stranger@example.com', passwordHash: 'unused' },
    });
    const created = await urlService.create(
      { url: 'https://example.com' },
      ownerId,
    );

    // Both answer as if the link did not exist, so codes cannot be probed
    const { shortCode } = created;
    expect(await urlService.getStats(shortCode, stranger.id)).toBeNull();
    expect(await urlService.delete(shortCode, stranger.id)).toBe(false);
    expect(await urlService.getStats(shortCode, ownerId)).not.toBeNull();
  });

  it('resolves a redirect for a link owned by someone else', async () => {
    const created = await urlService.create(
      { url: 'https://example.com' },
      ownerId,
    );

    // The redirect is public, ownership only guards the management routes
    const result = await urlService.resolveRedirect(created.shortCode, {});

    expect(result.status).toBe('active');
  });
});

describe('urlService.resolveRedirect click data', () => {
  beforeEach(resetDatabase);

  it('records what the visitor sent along', async () => {
    const created = await urlService.create(
      { url: 'https://example.com' },
      ownerId,
    );

    await urlService.resolveRedirect(created.shortCode, {
      userAgent: 'curl/8',
      referer: 'https://news.example',
      ip: '203.0.113.7',
    });

    const [click] = await prisma.click.findMany({
      where: { urlId: created.id },
    });
    expect(click).toMatchObject({
      userAgent: 'curl/8',
      referer: 'https://news.example',
      ip: '203.0.113.7',
    });
  });

  it('records a visit that came with no headers at all', async () => {
    const created = await urlService.create(
      { url: 'https://example.com' },
      ownerId,
    );

    await urlService.resolveRedirect(created.shortCode, {});

    const [click] = await prisma.click.findMany({
      where: { urlId: created.id },
    });
    expect(click.userAgent).toBeNull();
    expect(click.ip).toBeNull();
  });
});
