/**
 * Prisma reports a violated unique constraint as P2002. Recognising it is what
 * lets a race between a check and the insert that follows it answer with the
 * same conflict the check itself would have raised.
 */
const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2002';

export { isUniqueViolation };
