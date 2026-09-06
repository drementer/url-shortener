import userRepository from '../../repositories/user';
import sessionRepository from '../../repositories/session';
import { UnauthorizedError } from '../../errors';
import { env } from '../../configs/env';
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from '../../utils/tokens';
import type { SessionContext } from './types';

const INVALID_REFRESH_TOKEN = 'Invalid refresh token';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Exchanges a refresh token for a new pair and retires the old one, so a
 * stolen token is only usable until the real client refreshes next.
 */
const refresh = async (refreshToken: string, context: SessionContext) => {
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

  const nextRefreshToken = createRefreshToken();

  // Retiring the current token, creating its replacement, and containing replay
  // leaks must happen atomically. If two requests holding the same token arrive
  // simultaneously, the loser's mass-revocation must never miss the winner's replacement.
  const rotated = await sessionRepository.rotate(session.id, session.userId, {
    userId: user.id,
    refreshTokenHash: hashRefreshToken(nextRefreshToken),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_IN_MS),
    userAgent: context.userAgent,
    ip: context.ip,
  });

  if (!rotated) {
    throw new UnauthorizedError(INVALID_REFRESH_TOKEN);
  }

  return {
    user,
    accessToken: createAccessToken({ sub: user.id, email: user.email }),
    refreshToken: nextRefreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  };
};

export { refresh };

