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
    return await prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllForUser(userId) {
    return await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};

export default sessionRepository;
