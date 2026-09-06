import prisma from '../db/prisma';

/**
 * Every suite shares one SQLite file, so each starts by clearing whatever the
 * previous one left behind. Order matters: rows are deleted before the rows
 * they point at.
 */
const resetDatabase = async () => {
  await prisma.click.deleteMany();
  await prisma.url.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
};

/** Links and sessions are owned, so most suites need an account to own them */
const createUser = (email: string) =>
  prisma.user.create({
    data: { email, passwordHash: 'unused-in-this-suite' },
  });

export { resetDatabase, createUser };
