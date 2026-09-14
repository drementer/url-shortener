import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { env } from '../configs/env';

const OPAQUE_TOKEN_BYTES = 48;

type AccessTokenPayload = {
  sub: string;
  email: string;
  role?: string;
};

const createAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });

const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof payload === 'string') return null;

    const { sub, email, role } = payload;
    if (typeof sub !== 'string' || typeof email !== 'string') return null;

    return {
      sub,
      email,
      ...(typeof role === 'string' ? { role } : {}),
    };
  } catch {
    return null;
  }
};

/**
 * The secrets the server hands out and later recognises by value: refresh
 * tokens and password reset tokens. Both are opaque to the client and carry no
 * payload, so the same pair of helpers mints and recognises them.
 */
const createOpaqueToken = () => randomBytes(OPAQUE_TOKEN_BYTES).toString('hex');

/**
 * Stored as a hash, so a leaked database cannot be replayed. A plain SHA-256 is
 * enough here, unlike for a password: the token is 48 random bytes, which no
 * amount of guessing gets through.
 */
const hashOpaqueToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

const createRefreshToken = () => createOpaqueToken();
const hashRefreshToken = (token: string) => hashOpaqueToken(token);

const createResetToken = () => createOpaqueToken();
const hashResetToken = (token: string) => hashOpaqueToken(token);

export {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  hashRefreshToken,
  createResetToken,
  hashResetToken,
};
export type { AccessTokenPayload };
