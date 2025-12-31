import prisma from '../lib/prisma';

export interface CreateUrlData {
  shortCode: string;
  originalUrl: string;
  expiresAt: Date | null;
}

const urlRepository = {
  async findAll() {
    return await prisma.url.findMany();
  },

  async create(data: CreateUrlData) {
    return await prisma.url.create({
      data: {
        shortCode: data.shortCode,
        originalUrl: data.originalUrl,
        expiresAt: data.expiresAt,
      },
    });
  },

  async findByShortCode(shortCode: string) {
    return await prisma.url.findFirst({
      where: { shortCode },
    });
  },

  async findByShortCodeWithClicks(shortCode: string) {
    return await prisma.url.findFirst({
      where: { shortCode },
      include: {
        clickEvents: true,
      },
    });
  },

  async delete(shortCode: string) {
    return await prisma.url.delete({
      where: { shortCode },
    });
  },
};

export default urlRepository;
