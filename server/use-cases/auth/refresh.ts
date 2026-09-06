import userRepository from '../../repositories/user';
import sessionRepository from '../../repositories/session';
import { UnauthorizedError } from '../../errors';
import { hashRefreshToken } from '../../utils/tokens';
import { startSession } from './session';
import type { SessionContext } from './types';

const INVALID_REFRESH_TOKEN = 'Invalid refresh token';

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

  // Reading the session and retiring it are two steps, so a second request
  // holding the same token can arrive in between. Consuming it conditionally
  // decides: whoever fails to consume is holding a copy.
  const consumed = await sessionRepository.revoke(session.id);

  if (!consumed) {
    await sessionRepository.revokeAllForUser(session.userId);
    throw new UnauthorizedError(INVALID_REFRESH_TOKEN);
  }

  return await startSession(user, context);
};

export { refresh };
