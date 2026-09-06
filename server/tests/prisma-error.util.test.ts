import { describe, expect, it } from 'bun:test';
import { isUniqueViolation } from '../utils/prisma-error';

describe('isUniqueViolation', () => {
  it('recognises the unique constraint code', () => {
    expect(isUniqueViolation({ code: 'P2002' })).toBe(true);
  });

  it('leaves every other Prisma error alone', () => {
    // P2025 is "record not found", which must not be answered as a conflict
    expect(isUniqueViolation({ code: 'P2025' })).toBe(false);
    const connectionError = Object.assign(new Error('nope'), {
      code: 'P1001',
    });
    expect(isUniqueViolation(connectionError)).toBe(false);
  });

  it('handles anything else that can be thrown', () => {
    expect(isUniqueViolation(new Error('plain failure'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation('P2002')).toBe(false);
  });
});
