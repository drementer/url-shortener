import prisma from '../db/prisma';
import type { UrlRepository } from '../types';

const urlRepository: UrlRepository = {
  async findAllByUser(userId) {
    const urls = await prisma.url.findMany({
      where: { userId },
      include: { _count: { select: { clickEvents: true } } },
    });

    // Translate the Prisma aggregate into the plain count the domain expects
    return urls.map(({ _count, ...url }) => ({
      ...url,
      clickCount: _count.clickEvents,
    }));
  },

  async create({ shortCode, customSlug, originalUrl, expiresAt, userId }) {
    const data = {
      shortCode,
      customSlug,
      originalUrl,
      expiresAt,
      userId,
    };

    return await prisma.url.create({ data });
  },

  async findByShortCode(shortCode) {
    return await prisma.url.findFirst({
      where: { shortCode },
    });
  },

  async findOwnedWithClicks(shortCode, userId) {
    return await prisma.url.findFirst({
      where: { shortCode, userId },
      include: {
        clickEvents: true,
      },
    });
  },

  async deleteOwned(shortCode, userId) {
    // deleteMany does not throw when no row matches, unlike delete
    const { count } = await prisma.url.deleteMany({
      where: { shortCode, userId },
    });

    return count;
  },
};

export default urlRepository;
