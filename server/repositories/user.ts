import prisma from '../db/prisma';
import { UniqueConstraintError } from '../errors';
import { isUniqueViolation } from '../utils/prisma-error';
import type { UserRepository } from '../types';

/** Selecting explicitly keeps passwordHash from leaking into a response */
const publicFields = {
  id: true,
  email: true,
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      maxActiveLinks: true,
    },
  },
  createdAt: true,
};

const userRepository: UserRepository = {
  async create({ email, passwordHash, roleId }) {
    let assignedRoleId = roleId;
    if (assignedRoleId === undefined) {
      const defaultRole = await prisma.role.findUnique({
        where: { name: 'USER' },
      });
      if (defaultRole) assignedRoleId = defaultRole.id;
    }

    const data = { email, passwordHash, roleId: assignedRoleId };

    try {
      return await prisma.user.create({ data, select: publicFields });
    } catch (error) {
      // Prisma's constraint code stops here, the caller only sees the collision
      if (isUniqueViolation(error)) throw new UniqueConstraintError();

      throw error;
    }
  },

  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      select: publicFields,
    });
  },

  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      select: publicFields,
    });
  },

  // Carries the password hash, so it is only for verifying a login attempt
  async findByEmailWithPassword(email) {
    return await prisma.user.findUnique({
      where: { email },
      select: { ...publicFields, passwordHash: true },
    });
  },

  async updateRole(userId, roleId) {
    return await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      select: publicFields,
    });
  },
};

export default userRepository;
