import { describe, expect, it } from 'bun:test';
import { credentialsSchema, refreshTokenSchema } from '../validators/auth';

const PASSWORD = 'correct horse battery';

/** validateBody answers with the first issue, so that is what is asserted */
const firstIssue = (input: unknown) =>
  credentialsSchema.safeParse(input).error?.issues[0]?.message;

describe('credentialsSchema', () => {
  it('accepts a well formed pair', () => {
    const result = credentialsSchema.safeParse({
      email: 'user@example.com',
      password: PASSWORD,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      email: 'user@example.com',
      password: PASSWORD,
    });
  });

  it('lowercases and trims the email', () => {
    const { data } = credentialsSchema.safeParse({
      email: '  Mixed.Case@Example.COM  ',
      password: PASSWORD,
    });

    // Storage relies on the casing, otherwise one address registers twice.
    // The trim happens first, so a pasted address is cleaned, not rejected.
    expect(data?.email).toBe('mixed.case@example.com');
  });

  it('rejects an email that is only whitespace', () => {
    expect(firstIssue({ email: '   ', password: PASSWORD })).toBe(
      'A valid email is required',
    );
  });

  it('rejects a missing or non-string email with the same message', () => {
    expect(firstIssue({ password: PASSWORD })).toBe(
      'A valid email is required',
    );
    expect(firstIssue({ email: 42, password: PASSWORD })).toBe(
      'A valid email is required',
    );
  });

  it('rejects a malformed email', () => {
    expect(firstIssue({ email: 'not-an-email', password: PASSWORD })).toBe(
      'A valid email is required',
    );
  });

  it('rejects a missing or non-string password with one message', () => {
    expect(firstIssue({ email: 'user@example.com' })).toBe(
      'A password is required',
    );
    expect(firstIssue({ email: 'user@example.com', password: 12345678 })).toBe(
      'A password is required',
    );
  });

  it('rejects a password below the minimum length', () => {
    expect(firstIssue({ email: 'user@example.com', password: 'short' })).toBe(
      'Password must be at least 8 characters',
    );
  });

  it('rejects a password past the maximum length', () => {
    // Bounded because every login attempt feeds the whole value to scrypt
    const tooLong = 'a'.repeat(129);

    expect(firstIssue({ email: 'user@example.com', password: tooLong })).toBe(
      'Password must be at most 128 characters',
    );
    expect(
      credentialsSchema.safeParse({
        email: 'user@example.com',
        password: 'a'.repeat(128),
      }).success,
    ).toBe(true);
  });

  it('drops fields the schema does not know about', () => {
    const { data } = credentialsSchema.safeParse({
      email: 'user@example.com',
      password: PASSWORD,
      role: 'admin',
    });

    expect(data).not.toHaveProperty('role');
  });
});

describe('refreshTokenSchema', () => {
  it('accepts a token', () => {
    const result = refreshTokenSchema.safeParse({ refreshToken: 'abc' });

    expect(result.success).toBe(true);
  });

  it('rejects a missing, empty or non-string token with one message', () => {
    const message = 'Refresh token is required';

    expect(refreshTokenSchema.safeParse({}).error?.issues[0]?.message).toBe(
      message,
    );
    expect(
      refreshTokenSchema.safeParse({ refreshToken: '' }).error?.issues[0]
        ?.message,
    ).toBe(message);
    expect(
      refreshTokenSchema.safeParse({ refreshToken: 42 }).error?.issues[0]
        ?.message,
    ).toBe(message);
  });
});
