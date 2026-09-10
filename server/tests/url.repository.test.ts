import { describe, expect, it, beforeEach } from 'bun:test';
import urlRepository from '../repositories/url';
import prisma from '../db/prisma';
import { UniqueConstraintError } from '../errors';
import { resetDatabase, createUser } from './helpers';

let ownerId: string;
let strangerId: string;

const newUrl = (shortCode: string, userId = ownerId) => ({
  shortCode,
  customSlug: null,
  originalUrl: 'https://example.com',
  expiresAt: null,
  userId,
});

beforeEach(async () => {
  await resetDatabase();
  ownerId = (await createUser('owner@example.com')).id;
  strangerId = (await createUser('stranger@example.com')).id;
});

describe('urlRepository.create', () => {
  it('stores the row and answers with the domain shape', async () => {
    const url = await urlRepository.create(newUrl('abc123'));

    expect(url).toMatchObject({
      shortCode: 'abc123',
      customSlug: null,
      originalUrl: 'https://example.com',
      expiresAt: null,
      userId: ownerId,
    });
    expect(url.id).toBeString();
    expect(url.createdAt).toBeDate();
  });

  it('reports a taken short code as a domain error', async () => {
    await urlRepository.create(newUrl('taken'));

    // Prisma's own code is translated here, so no use case has to know it
    const attempt = urlRepository.create(newUrl('taken', strangerId));

    await expect(attempt).rejects.toThrow(UniqueConstraintError);
  });
});

describe('urlRepository.findByShortCode', () => {
  it('finds a link no matter who owns it', async () => {
    await urlRepository.create(newUrl('public-code', strangerId));

    // The redirect is public, so this lookup deliberately ignores ownership
    const found = await urlRepository.findByShortCode('public-code');

    expect(found?.userId).toBe(strangerId);
  });

  it('answers null for a code nobody took', async () => {
    expect(await urlRepository.findByShortCode('nothing-here')).toBeNull();
  });
});

describe('urlRepository.findAllByUser', () => {
  it('lists only the links of the given owner', async () => {
    await urlRepository.create(newUrl('mine'));
    await urlRepository.create(newUrl('theirs', strangerId));

    const { items, total } = await urlRepository.findAllByUser(ownerId, {
      page: 1,
      limit: 20,
    });

    expect(items.map((url) => url.shortCode)).toEqual(['mine']);
    expect(total).toBe(1);
  });

  it('carries the click count as a plain number', async () => {
    const url = await urlRepository.create(newUrl('counted'));
    await prisma.click.createMany({
      data: [{ urlId: url.id }, { urlId: url.id }],
    });

    const { items } = await urlRepository.findAllByUser(ownerId, {
      page: 1,
      limit: 20,
    });
    const [found] = items;

    // The Prisma _count aggregate must not reach the domain untranslated
    expect(found!.clickCount).toBe(2);
    expect(found).not.toHaveProperty('_count');
  });

  it('answers with an empty list for an owner with no links', async () => {
    expect(
      await urlRepository.findAllByUser(ownerId, { page: 1, limit: 20 }),
    ).toEqual({ items: [], total: 0 });
  });

  it('answers one page at a time, newest first', async () => {
    // createdAt is set here rather than left to the clock, so the two rows
    // cannot land in the same millisecond and fall back to the tiebreaker
    await prisma.url.createMany({
      data: [
        { shortCode: 'older', originalUrl: 'https://example.com', userId: ownerId, createdAt: new Date('2026-01-01T00:00:00.000Z') },
        { shortCode: 'newer', originalUrl: 'https://example.com', userId: ownerId, createdAt: new Date('2026-01-02T00:00:00.000Z') },
      ],
    });

    const first = await urlRepository.findAllByUser(ownerId, {
      page: 1,
      limit: 1,
    });
    const second = await urlRepository.findAllByUser(ownerId, {
      page: 2,
      limit: 1,
    });

    expect(first.items.map((url) => url.shortCode)).toEqual(['newer']);
    expect(second.items.map((url) => url.shortCode)).toEqual(['older']);
    // The count covers the whole collection, not the page that was served
    expect(first.total).toBe(2);
  });

  it('orders links sharing a timestamp by their short code', async () => {
    // Two links created in the same millisecond have no order of their own, so
    // the query breaks the tie on the unique short code. Without it the pages
    // are free to repeat one row and never reach the other.
    const createdAt = new Date('2026-02-02T00:00:00.000Z');
    await prisma.url.createMany({
      data: ['tied-a', 'tied-b'].map((shortCode) => ({
        shortCode,
        originalUrl: 'https://example.com',
        userId: ownerId,
        createdAt,
      })),
    });

    const { items } = await urlRepository.findAllByUser(ownerId, {
      page: 1,
      limit: 20,
    });

    expect(items.map((url) => url.shortCode)).toEqual(['tied-b', 'tied-a']);
  });
});

describe('urlRepository.findOwnedWithClicks', () => {
  it('returns the link with its click events', async () => {
    const url = await urlRepository.create(newUrl('with-clicks'));
    await prisma.click.create({ data: { urlId: url.id, ip: '203.0.113.7' } });

    const found = await urlRepository.findOwnedWithClicks(
      'with-clicks',
      ownerId,
    );

    expect(found?.clickEvents).toHaveLength(1);
  });

  it('answers null for a link belonging to someone else', async () => {
    await urlRepository.create(newUrl('not-yours'));

    // Indistinguishable from a code that does not exist, so none can be probed
    expect(
      await urlRepository.findOwnedWithClicks('not-yours', strangerId),
    ).toBeNull();
    expect(
      await urlRepository.findOwnedWithClicks('nothing-here', ownerId),
    ).toBeNull();
  });
});

describe('urlRepository.deleteOwned', () => {
  it('removes the link and reports one row', async () => {
    await urlRepository.create(newUrl('removable'));

    expect(await urlRepository.deleteOwned('removable', ownerId)).toBe(1);
    expect(await urlRepository.findByShortCode('removable')).toBeNull();
  });

  it('takes the click events down with the link', async () => {
    const url = await urlRepository.create(newUrl('cascading'));
    await prisma.click.create({ data: { urlId: url.id } });

    await urlRepository.deleteOwned('cascading', ownerId);

    expect(await prisma.click.count({ where: { urlId: url.id } })).toBe(0);
  });

  it('reports zero rows instead of throwing when nothing matches', async () => {
    await urlRepository.create(newUrl('kept'));

    expect(await urlRepository.deleteOwned('kept', strangerId)).toBe(0);
    expect(await urlRepository.deleteOwned('nothing-here', ownerId)).toBe(0);
    expect(await urlRepository.findByShortCode('kept')).not.toBeNull();
  });
});
