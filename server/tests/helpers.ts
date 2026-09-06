import prisma from '../db/prisma';
import { ensureDefaultRoles } from '../use-cases/role';

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
  await prisma.role.deleteMany();
  await ensureDefaultRoles();
};

/** Links and sessions are owned, so most suites need an account to own them */
const createUser = async (email: string, roleName = 'USER') => {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  return await prisma.user.create({
    data: {
      email,
      passwordHash: 'unused-in-this-suite',
      roleId: role?.id ?? null,
    },
  });
};

export { resetDatabase, createUser };
