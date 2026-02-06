import prisma from '../lib/prisma';

const urlRepository = {
  async findAll() {
    return await prisma.url.findMany();
  },

  async create({
    shortCode,
    originalUrl,
    expiresAt,
  }: {
    shortCode: string;
    originalUrl: string;
    expiresAt: Date | null;
  }) {
    const data = {
      shortCode,
      originalUrl,
      expiresAt,
    };
    return await prisma.url.create({ data });
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
