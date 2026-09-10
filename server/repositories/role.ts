import prisma from '../db/prisma';
import { UniqueConstraintError } from '../errors';
import { isUniqueViolation } from '../utils/prisma-error';
import type { RoleRepository } from '../types';

const roleRepository: RoleRepository = {
  async findAll() {
    return await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async findById(id) {
    return await prisma.role.findUnique({
      where: { id },
    });
  },

  async findByName(name) {
    return await prisma.role.findUnique({
      where: { name },
    });
  },

  async create(data) {
    try {
      return await prisma.role.create({ data });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UniqueConstraintError('Role name already exists');
      throw error;
    }
  },

  async update(id, data) {
    try {
      return await prisma.role.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UniqueConstraintError('Role name already exists');
      throw error;
    }
  },

  async deleteIfUnassigned(id) {
    // The absence of users is part of the delete rather than a check before
    // it: between a separate count and this call a role can be handed out,
    // and the relation is onDelete SetNull, so the delete would then strip
    // that account of its role instead of being refused
    const { count } = await prisma.role.deleteMany({
      where: { id, users: { none: {} } },
    });

    return count;
  },
};

export default roleRepository;
