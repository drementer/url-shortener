import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../configs/env';

const REFRESH_TOKEN_BYTES = 48;

type AccessTokenPayload = {
  sub: string;
  email: string;
};

const createAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });

const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof payload === 'string') return null;

    const { sub, email } = payload;
    if (typeof sub !== 'string' || typeof email !== 'string') return null;

    return { sub, email };
  } catch {
    return null;
  }
};

const createRefreshToken = () =>
  randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

/**
 * Refresh tokens are stored as a hash, so a leaked database cannot be replayed.
 * A plain SHA-256 is enough here, unlike for a password: the token is 48 random
 * bytes, which no amount of guessing gets through.
 */
const hashRefreshToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  hashRefreshToken,
};
export type { AccessTokenPayload };
