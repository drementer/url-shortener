import prisma from '../db/prisma';
import type { SessionRepository } from '../types';

const sessionRepository: SessionRepository = {
  async create({ userId, refreshTokenHash, expiresAt, userAgent, ip }) {
    const data = { userId, refreshTokenHash, expiresAt, userAgent, ip };

    return await prisma.session.create({ data });
  },

  async findByTokenHash(refreshTokenHash) {
    return await prisma.session.findUnique({ where: { refreshTokenHash } });
  },

  async revoke(id) {
    // Conditional on revokedAt, so of two requests holding the same token only
    // one can consume it. The other gets a count of zero and knows it lost.
    const { count } = await prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return count;
  },

  async revokeAllForUser(userId) {
    return await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};

export default sessionRepository;
