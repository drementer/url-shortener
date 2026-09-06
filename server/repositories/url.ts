import prisma from '../db/prisma';
import { UniqueConstraintError, QuotaExceededError } from '../errors';
import { isUniqueViolation } from '../utils/prisma-error';
import { canCreateLink, formatQuotaExceededMessage } from '../domain/role';
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

  async create(
    { shortCode, customSlug, originalUrl, expiresAt, userId },
    quota,
  ) {
    const data = {
      shortCode,
      customSlug,
      originalUrl,
      expiresAt,
      userId,
    };

    if (quota?.maxActiveLinks !== null && quota?.maxActiveLinks !== undefined) {
      return await prisma.$transaction(async (tx) => {
        const now = new Date();
        const activeCount = await tx.url.count({
          where: {
            userId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        });

        if (!canCreateLink(activeCount, quota.maxActiveLinks!)) {
          throw new QuotaExceededError(
            formatQuotaExceededMessage(quota.roleName ?? 'USER', quota.maxActiveLinks!),
          );
        }

        try {
          return await tx.url.create({ data });
        } catch (error) {
          if (isUniqueViolation(error)) throw new UniqueConstraintError();

          throw error;
        }
      });
    }

    try {
      return await prisma.url.create({ data });
    } catch (error) {
      // Prisma's constraint code stops here, the caller only sees the collision
      if (isUniqueViolation(error)) throw new UniqueConstraintError();

      throw error;
    }
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

  async countActiveByUser(userId) {
    const now = new Date();
    return await prisma.url.count({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    });
  },
};

export default urlRepository;
