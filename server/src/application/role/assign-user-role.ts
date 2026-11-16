import userRepository from '../../infrastructure/repositories/user';
import roleRepository from '../../infrastructure/repositories/role';
import sessionRepository from '../../infrastructure/repositories/session';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { NotFoundError } from '../../domain/errors';
import { recordAuditEvent } from '../audit';
import type { AuditActor } from '../../domain/types';

const assignUserRole = async (
  userId: string,
  roleId: string | null,
  actor: AuditActor,
) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  let assignedRoleName: string | null = null;
  if (roleId !== null) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    assignedRoleName = role.name;
  }

  const updatedUser = await userRepository.updateRole(userId, roleId);
  await sessionRepository.revokeAllForUser(userId);

  await recordAuditEvent({
    action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
    actorId: actor.id,
    actorEmail: actor.email,
    targetType: 'User',
    targetId: userId,
    metadata: {
      targetEmail: user.email,
      previousRoleId: user.roleId,
      roleId,
      roleName: assignedRoleName,
    },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  return updatedUser;
};

export { assignUserRole };
