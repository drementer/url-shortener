import prisma from '../db/prisma';
import type { ClickRepository } from '../types';

const clickRepository: ClickRepository = {
  async create({ urlId, userAgent, referer, ip }) {
    const data = {
      urlId,
      userAgent,
      referer,
      ip,
    };

    return await prisma.click.create({ data });
  },
};

export default clickRepository;
