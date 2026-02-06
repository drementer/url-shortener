import prisma from '../lib/prisma';

const clickRepository = {
  async create({
    urlId,
    userAgent,
    referer,
    ip,
  }: {
    urlId: string;
    userAgent?: string;
    referer?: string;
    ip?: string;
  }) {
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
