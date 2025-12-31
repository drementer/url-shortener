import prisma from '../lib/prisma';

export interface CreateClickData {
  urlId: string;
  userAgent?: string;
  referer?: string;
  ip?: string;
}

const clickRepository = {
  async create(data: CreateClickData) {
    return await prisma.click.create({
      data: {
        urlId: data.urlId,
        userAgent: data.userAgent,
        referer: data.referer,
        ip: data.ip,
      },
    });
  },
};

export default clickRepository;
