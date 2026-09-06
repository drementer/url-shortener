import sessionRepository from '../../repositories/session';
import { env } from '../../configs/env';
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} from '../../utils/tokens';
import type { User } from '../../types';
import type { SessionContext } from './types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Starts a session and hands out the pair the client works with: a short lived
 * access token it sends on every request, and a refresh token it exchanges for
 * a new pair. Only the refresh token can be revoked server side.
 *
 * Shared by every use case that hands out a session, so register, login and
 * refresh cannot end up issuing different things.
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
    accessToken: createAccessToken({
      sub: user.id,
      email: user.email,
      ...(user.role?.name ? { role: user.role.name } : {}),
    }),
    refreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  };
};

export { startSession };
