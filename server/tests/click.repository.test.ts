import { describe, expect, it, beforeEach } from 'bun:test';
import clickRepository from '../repositories/click';
import prisma from '../db/prisma';
import { resetDatabase, createUser } from './helpers';

let urlId: string;

beforeEach(async () => {
  await resetDatabase();
  const owner = await createUser('click-owner@example.com');
  const url = await prisma.url.create({
    data: {
      shortCode: 'clicked',
      originalUrl: 'https://example.com',
      userId: owner.id,
    },
  });

  urlId = url.id;
});

describe('clickRepository.create', () => {
  it('records the visit against the link', async () => {
    await clickRepository.create({
      urlId,
      userAgent: 'curl/8',
      referer: 'https://news.example',
      ip: '203.0.113.7',
    });

    const [click] = await prisma.click.findMany({ where: { urlId } });

    expect(click).toMatchObject({
      userAgent: 'curl/8',
      referer: 'https://news.example',
      ip: '203.0.113.7',
    });
    expect(click.createdAt).toBeDate();
  });

  it('records a visit that came with no headers at all', async () => {
    await clickRepository.create({ urlId });

    const [click] = await prisma.click.findMany({ where: { urlId } });

    expect(click.userAgent).toBeNull();
    expect(click.referer).toBeNull();
    expect(click.ip).toBeNull();
  });

  it('counts every visit separately', async () => {
    await clickRepository.create({ urlId });
    await clickRepository.create({ urlId });

    expect(await prisma.click.count({ where: { urlId } })).toBe(2);
  });
});
