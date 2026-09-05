import { describe, expect, it, beforeEach } from 'bun:test';
import urlService from '../services/url';
import prisma from '../db/prisma';
import { ConflictError } from '../errors';

const resetDatabase = async () => {
  await prisma.click.deleteMany();
  await prisma.url.deleteMany();
};

describe('urlService.create', () => {
  beforeEach(resetDatabase);

  it('generates a short code when no custom slug is given', async () => {
    const url = await urlService.create({ url: 'https://example.com' });

    expect(url.shortCode).toHaveLength(6);
    expect(url.customSlug).toBeNull();
    expect(url.expiresAt).toBeNull();
  });

  it('stores a custom slug as both the short code and the slug', async () => {
    const url = await urlService.create({
      url: 'https://example.com',
      customSlug: 'my-slug',
    });

    expect(url.shortCode).toBe('my-slug');
    expect(url.customSlug).toBe('my-slug');
  });

  it('rejects a custom slug that is already taken', async () => {
    await urlService.create({
      url: 'https://example.com',
      customSlug: 'taken',
    });

    const attempt = urlService.create({
      url: 'https://other.com',
      customSlug: 'taken',
    });

    await expect(attempt).rejects.toThrow(ConflictError);
  });

  it('turns expiresIn hours into an absolute date', async () => {
    const before = Date.now();
    const url = await urlService.create({
      url: 'https://example.com',
      expiresIn: 2,
    });

    const diffHours = (url.expiresAt!.getTime() - before) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(1.9);
    expect(diffHours).toBeLessThan(2.1);
  });
});

describe('urlService.resolveRedirect', () => {
  beforeEach(resetDatabase);

  it('records a click and returns the target for a live link', async () => {
    const created = await urlService.create({ url: 'https://example.com' });

    const result = await urlService.resolveRedirect(created.shortCode, {
      ip: '127.0.0.1',
    });

    expect(result.status).toBe('active');
    expect(result.url?.originalUrl).toBe('https://example.com');
    expect(await prisma.click.count({ where: { urlId: created.id } })).toBe(1);
  });

  it('reports an expired link without recording the click', async () => {
    const created = await urlService.create({
      url: 'https://example.com',
      expiresIn: 1,
    });
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
    const created = await urlService.create({ url: 'https://example.com' });

    expect(await urlService.delete(created.shortCode)).toBe(true);
  });

  it('returns false for an unknown code instead of throwing', async () => {
    expect(await urlService.delete('nothing-here')).toBe(false);
  });
});

describe('urlService.getStats', () => {
  beforeEach(resetDatabase);

  it('returns null for an unknown code', async () => {
    expect(await urlService.getStats('nothing-here')).toBeNull();
  });

  it('returns the click events of a known code', async () => {
    const created = await urlService.create({ url: 'https://example.com' });
    await urlService.resolveRedirect(created.shortCode, {});

    const stats = await urlService.getStats(created.shortCode);

    expect(stats?.clickEvents).toHaveLength(1);
  });
});
