import prisma from '../db/prisma';
import type { PasswordResetRepository } from '../types';

/**
 * The token itself is never stored, only its hash, so a leaked database hands
 * out nothing that can be presented to the reset endpoint.
 */
const passwordResetRepository: PasswordResetRepository = {
  async create({ userId, tokenHash, expiresAt }) {
    const data = { userId, tokenHash, expiresAt };

    return await prisma.passwordResetToken.create({ data });
  },

  async findByTokenHash(tokenHash) {
    return await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  },

  async spend(id, userId, passwordHash) {
    // Retiring the token and setting the password it was issued for must happen
    // atomically, otherwise a failure between the two burns the link without
    // changing anything and leaves the account stuck on its old password.
    return await prisma.$transaction(async (tx) => {
      // Conditional on usedAt, so of two requests presenting the same token only
      // one can spend it. The other gets a count of zero and knows it lost.
      const { count } = await tx.passwordResetToken.updateMany({
        where: { id, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (!count) return 0;

      await tx.user.update({ where: { id: userId }, data: { passwordHash } });

      return count;
    });
  },

  async invalidateAllForUser(userId) {
    return await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },
};

export default passwordResetRepository;
