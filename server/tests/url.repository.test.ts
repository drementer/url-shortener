import { describe, expect, it, beforeEach } from 'bun:test';
import urlRepository from '../repositories/url';
import prisma from '../db/prisma';
import { isUniqueViolation } from '../utils/prisma-error';
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

  it('reports a taken short code as a unique violation', async () => {
    await urlRepository.create(newUrl('taken'));

    // The service turns exactly this into a 409, so the code has to survive
    const error = await urlRepository
      .create(newUrl('taken', strangerId))
      .catch((error: unknown) => error);

    expect(isUniqueViolation(error)).toBe(true);
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

    const urls = await urlRepository.findAllByUser(ownerId);

    expect(urls.map((url) => url.shortCode)).toEqual(['mine']);
  });

  it('carries the click count as a plain number', async () => {
    const url = await urlRepository.create(newUrl('counted'));
    await prisma.click.createMany({
      data: [{ urlId: url.id }, { urlId: url.id }],
    });

    const [found] = await urlRepository.findAllByUser(ownerId);

    // The Prisma _count aggregate must not reach the domain untranslated
    expect(found.clickCount).toBe(2);
    expect(found).not.toHaveProperty('_count');
  });

  it('answers with an empty list for an owner with no links', async () => {
    expect(await urlRepository.findAllByUser(ownerId)).toEqual([]);
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
