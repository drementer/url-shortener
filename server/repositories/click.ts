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
    return await prisma.click.create({
      data: {
        urlId,
        userAgent,
        referer,
        ip,
      },
    });
  },
};

export default clickRepository;
