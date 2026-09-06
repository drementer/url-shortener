import { describe, expect, it } from 'bun:test';
import jwt from 'jsonwebtoken';
import { env } from '../configs/env';
import {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from '../utils/tokens';

const PAYLOAD = { sub: 'user-1', email: 'token@example.com' };

describe('access tokens', () => {
  it('reads back the claims it was signed with', () => {
    const token = createAccessToken(PAYLOAD);

    expect(verifyAccessToken(token)).toEqual(PAYLOAD);
  });

  it('carries an expiry taken from the configured lifetime', () => {
    const { iat, exp } = jwt.decode(createAccessToken(PAYLOAD)) as {
      iat: number;
      exp: number;
    };

    expect(exp - iat).toBe(env.ACCESS_TOKEN_TTL_SECONDS);
  });

  it('returns null instead of throwing for a token it cannot verify', () => {
    expect(verifyAccessToken('not-a-token-at-all')).toBeNull();
    expect(verifyAccessToken('')).toBeNull();
  });

  it('returns null for a token signed with another secret', () => {
    const forged = jwt.sign(PAYLOAD, 'a-different-secret-of-enough-length');

    expect(verifyAccessToken(forged)).toBeNull();
  });

  it('returns null once the token has expired', () => {
    const expired = jwt.sign(PAYLOAD, env.JWT_ACCESS_SECRET, {
      expiresIn: -10,
    });

    expect(verifyAccessToken(expired)).toBeNull();
  });

  it('returns null for a valid signature with claims missing', () => {
    // Signed by us, so only the shape check can reject it
    const noEmail = jwt.sign({ sub: 'user-1' }, env.JWT_ACCESS_SECRET);
    const noSub = jwt.sign(
      { email: 'token@example.com' },
      env.JWT_ACCESS_SECRET,
    );

    expect(verifyAccessToken(noEmail)).toBeNull();
    expect(verifyAccessToken(noSub)).toBeNull();
  });
});

describe('refresh tokens', () => {
  it('is 48 random bytes written as hex', () => {
    expect(createRefreshToken()).toMatch(/^[0-9a-f]{96}$/);
  });

  it('hands out a different token every time', () => {
    const tokens = new Set(Array.from({ length: 100 }, createRefreshToken));

    expect(tokens.size).toBe(100);
  });

  it('hashes the same token to the same value, and only that token', () => {
    const token = createRefreshToken();

    // The lookup is by hash, so the same input has to land on the same row
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRefreshToken(token)).not.toBe(
      hashRefreshToken(createRefreshToken()),
    );
  });

  it('does not store the token itself', () => {
    const token = createRefreshToken();

    expect(hashRefreshToken(token)).not.toContain(token);
  });
});
