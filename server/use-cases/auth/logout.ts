import sessionRepository from '../../repositories/session';
import { hashRefreshToken } from '../../utils/tokens';

/**
 * Ends the session behind the given refresh token. An unknown token is not
 * reported as an error: the caller is logged out either way.
 */
const logout = async (refreshToken: string) => {
  const session = await sessionRepository.findByTokenHash(
    hashRefreshToken(refreshToken),
  );

  if (session && !session.revokedAt) {
    await sessionRepository.revoke(session.id);
  }
};

export { logout };
