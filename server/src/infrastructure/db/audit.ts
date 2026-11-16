import path from 'node:path';
import { PrismaClient } from '@prisma/audit-client';
import { env } from '../config/env';

const deriveAuditDatabaseUrl = () => {
  if (env.AUDIT_DATABASE_URL) {
    return env.AUDIT_DATABASE_URL;
  }

  // Fall back to an audit.db file next to the primary SQLite database when
  // AUDIT_DATABASE_URL is not explicitly configured.
  const mainPath = env.DATABASE_URL.startsWith('file:')
    ? env.DATABASE_URL.slice('file:'.length)
    : env.DATABASE_URL;
  const fileName =
    path.basename(mainPath) === 'test.db' ? 'audit-test.db' : 'audit.db';

  if (path.isAbsolute(mainPath)) {
    return `file:${path.join(path.dirname(mainPath), fileName)}`;
  }

  return `file:${path.resolve('prisma', path.dirname(mainPath), fileName)}`;
};

const auditDatabaseUrl = deriveAuditDatabaseUrl();

const auditPrisma = new PrismaClient(
  env.AUDIT_DATABASE_URL
    ? undefined
    : { datasources: { db: { url: auditDatabaseUrl } } },
);

export default auditPrisma;
export { auditDatabaseUrl };
