import path from 'node:path';
import { PrismaClient } from '@prisma/audit-client';
import { env } from '../config/env';

const deriveAuditDatabaseUrl = () => {
  if (env.AUDIT_DATABASE_URL) {
    return env.AUDIT_DATABASE_URL;
  }

  // Fall back to an audit DB next to the primary SQLite file when
  // DATABASE_URL is absolute, or relative to prisma-audit/schema.prisma when
  // DATABASE_URL is relative (matching AUDIT_DATABASE_URL="file:./audit.db").
  const mainPath = env.DATABASE_URL.startsWith('file:')
    ? env.DATABASE_URL.slice('file:'.length)
    : env.DATABASE_URL;
  const fileName =
    path.basename(mainPath) === 'test.db' ? 'audit-test.db' : 'audit.db';

  if (path.isAbsolute(mainPath)) {
    return `file:${path.join(path.dirname(mainPath), fileName)}`;
  }

  const dir = path.posix.dirname(mainPath);
  return dir === '.'
    ? `file:./${fileName}`
    : `file:${path.posix.join(dir, fileName)}`;
};

const auditDatabaseUrl = deriveAuditDatabaseUrl();

const auditPrisma = new PrismaClient(
  env.AUDIT_DATABASE_URL
    ? undefined
    : { datasources: { db: { url: auditDatabaseUrl } } },
);

export default auditPrisma;
export { auditDatabaseUrl };
