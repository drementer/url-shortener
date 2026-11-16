import userRepository from '../../infrastructure/repositories/user';
import { ForbiddenError } from '../../domain/errors';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { recordAuditEvent } from '../audit';
import type { AuditActor } from '../../domain/types';

/**
 * Confirms the account still holds one of the roles a route demands.
 * Read from storage rather than the token claim, so a demoted account loses
 * access on its next request instead of when its token expires.
 */
const authorizeRole = async (
  userId: string,
  allowedRoles: string[],
  actor?: AuditActor,
  targetPath?: string,
) => {
  const user = await userRepository.findById(userId);
  const currentRole = user?.role?.name;

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    await recordAuditEvent({
      action: AUDIT_ACTIONS.AUTH_ACCESS_DENIED,
      actorId: userId,
      actorEmail: actor?.email ?? user?.email,
      targetType: 'Route',
      targetId: targetPath ?? null,
      metadata: {
        allowedRoles,
        actualRole: currentRole ?? null,
      },
      ip: actor?.ip,
      userAgent: actor?.userAgent,
    });
    throw new ForbiddenError('Insufficient permissions');
  }
};

export { authorizeRole };
