import sessionRepository from '../../infrastructure/repositories/session';
import userRepository from '../../infrastructure/repositories/user';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { hashRefreshToken } from '../../infrastructure/crypto/tokens';
import { recordAuditEvent } from '../audit';
import type { SessionContext } from './types';

/**
 * Ends the session behind the given refresh token. An unknown token is not
 * reported as an error: the caller is logged out either way.
 */
const logout = async (refreshToken: string, context?: SessionContext) => {
  const session = await sessionRepository.findByTokenHash(
    hashRefreshToken(refreshToken),
  );

  if (session && !session.revokedAt) {
    const revoked = await sessionRepository.revoke(session.id);

    if (revoked > 0) {
      const user = await userRepository.findById(session.userId);
      await recordAuditEvent({
        action: AUDIT_ACTIONS.AUTH_LOGOUT,
        actorId: session.userId,
        actorEmail: user?.email ?? null,
        targetType: 'Session',
        targetId: session.id,
        ip: context?.ip,
        userAgent: context?.userAgent,
      });
    }
  }
};

export { logout };
