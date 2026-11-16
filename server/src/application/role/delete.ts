import roleRepository from '../../infrastructure/repositories/role';
import userRepository from '../../infrastructure/repositories/user';
import { ADMIN_ROLE_NAME } from '../../domain/role';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { NotFoundError, ConflictError, BadRequestError } from '../../domain/errors';
import { recordAuditEvent } from '../audit';
import type { AuditActor } from '../../domain/types';

/**
 * Removes a role, provided nothing depends on it.
 *
 * ADMIN is refused because ensureDefaultRoles recreates it on the next boot,
 * leaving the installation without an administrator in between. A role still
 * held by someone is refused because dropping it would silently strip those
 * accounts of their link quota.
 */
const deleteRole = async (id: string, actor: AuditActor) => {
  const role = await roleRepository.findById(id);
  if (!role) {
    throw new NotFoundError('Role not found');
  }

  if (role.name === ADMIN_ROLE_NAME) {
    throw new BadRequestError('Cannot delete the built-in ADMIN role');
  }

  const deleted = await roleRepository.deleteIfUnassigned(id);
  if (deleted) {
    await recordAuditEvent({
      action: AUDIT_ACTIONS.ROLE_DELETED,
      actorId: actor.id,
      actorEmail: actor.email,
      targetType: 'Role',
      targetId: role.id,
      metadata: {
        name: role.name,
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return;
  }

  // The delete refused, so the role is spoken for. Counting afterwards only
  // shapes the message; the decision was made by the conditional delete. The
  // row can also have gone in the meantime, and then nobody holds it.
  const assignedUsers = await userRepository.countByRole(id);
  if (!assignedUsers) {
    throw new NotFoundError('Role not found');
  }

  throw new ConflictError(`Role is still assigned to ${assignedUsers} user(s)`);
};

export { deleteRole };
