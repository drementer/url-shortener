import prisma from '../db/prisma';
import type { UrlRepository } from '../services/ports';

const urlRepository: UrlRepository = {
  async findAll() {
    const urls = await prisma.url.findMany({
      include: { _count: { select: { clickEvents: true } } },
    });

    // Translate the Prisma aggregate into the plain count the domain expects
    return urls.map(({ _count, ...url }) => ({
      ...url,
      clickCount: _count.clickEvents,
    }));
  },

  async create({ shortCode, customSlug, originalUrl, expiresAt }) {
    const data = {
      shortCode,
      customSlug,
      originalUrl,
      expiresAt,
    };

    return await prisma.url.create({ data });
  },

  async findByShortCode(shortCode) {
    return await prisma.url.findFirst({
      where: { shortCode },
    });
  },

  async findByShortCodeWithClicks(shortCode) {
    return await prisma.url.findFirst({
      where: { shortCode },
      include: {
        clickEvents: true,
      },
    });
  },

  async delete(shortCode) {
    // deleteMany does not throw when no row matches, unlike delete
    const { count } = await prisma.url.deleteMany({
      where: { shortCode },
    });

    return count;
  },
};

export default urlRepository;
