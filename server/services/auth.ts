import { randomBytes } from 'node:crypto';

import userRepository from '../repositories/user';
import sessionRepository from '../repositories/session';
import { env } from '../configs/env';
import { ConflictError, UnauthorizedError } from '../errors';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from '../utils/tokens';
import type { User } from '../types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS = 'Invalid email or password';
const INVALID_REFRESH_TOKEN = 'Invalid refresh token';

type Credentials = {
  email: string;
  password: string;
};

type SessionContext = {
  userAgent?: string;
  ip?: string;
};

/**
 * Verified against when the email is unknown, so a login attempt costs the same
 * whether or not the account exists and cannot be timed to enumerate users.
 */
const decoyHash = hashPassword(randomBytes(16).toString('hex'));

/**
 * Starts a session and hands out the pair the client works with: a short lived
 * access token it sends on every request, and a refresh token it exchanges for
 * a new pair. Only the refresh token can be revoked server side.
 */
const startSession = async (user: User, context: SessionContext) => {
  const refreshToken = createRefreshToken();

  await sessionRepository.create({
    userId: user.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_IN_MS),
    userAgent: context.userAgent,
    ip: context.ip,
  });

  return {
    user,
    accessToken: createAccessToken({ sub: user.id, email: user.email }),
    refreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  };
};

const authService = {
  // Input shape is guaranteed by credentialsSchema at the route level
  async register({ email, password }: Credentials, context: SessionContext) {
    const existing = await userRepository.findByEmail(email);
    if (existing) throw new ConflictError('This email is already registered');

    const user = await userRepository.create({
      email,
      passwordHash: await hashPassword(password),
    });

    return await startSession(user, context);
  },

  async login({ email, password }: Credentials, context: SessionContext) {
    const user = await userRepository.findByEmailWithPassword(email);

    const isValid = await verifyPassword(
      password,
      user ? user.passwordHash : await decoyHash,
    );

    if (!user || !isValid) throw new UnauthorizedError(INVALID_CREDENTIALS);

    const { passwordHash, ...publicUser } = user;

    return await startSession(publicUser, context);
  },

  /**
   * Exchanges a refresh token for a new pair and retires the old one, so a
   * stolen token is only usable until the real client refreshes next.
   */
  async refresh(refreshToken: string, context: SessionContext) {
    const session = await sessionRepository.findByTokenHash(
      hashRefreshToken(refreshToken),
    );

    if (!session) throw new UnauthorizedError(INVALID_REFRESH_TOKEN);

    // A retired token being replayed means it leaked: end every session
    if (session.revokedAt) {
      await sessionRepository.revokeAllForUser(session.userId);
      throw new UnauthorizedError(INVALID_REFRESH_TOKEN);
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await userRepository.findById(session.userId);
    if (!user) throw new UnauthorizedError(INVALID_REFRESH_TOKEN);

    await sessionRepository.revoke(session.id);

    return await startSession(user, context);
  },

  /**
   * Ends the session behind the given refresh token. An unknown token is not
   * reported as an error: the caller is logged out either way.
   */
  async logout(refreshToken: string) {
    const session = await sessionRepository.findByTokenHash(
      hashRefreshToken(refreshToken),
    );

    if (session && !session.revokedAt) {
      await sessionRepository.revoke(session.id);
    }
  },

  async findCurrentUser(userId: string) {
    return await userRepository.findById(userId);
  },
};

export default authService;
export type { Credentials, SessionContext };
