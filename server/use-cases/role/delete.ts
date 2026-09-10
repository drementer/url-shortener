import roleRepository from '../../repositories/role';
import userRepository from '../../repositories/user';
import { ADMIN_ROLE_NAME } from '../../domain/role';
import { NotFoundError, ConflictError, BadRequestError } from '../../errors';

/**
 * Removes a role, provided nothing depends on it.
 *
 * ADMIN is refused because ensureDefaultRoles recreates it on the next boot,
 * leaving the installation without an administrator in between. A role still
 * held by someone is refused because dropping it would silently strip those
 * accounts of their link quota.
 */
const deleteRole = async (id: string) => {
  const role = await roleRepository.findById(id);
  if (!role) {
    throw new NotFoundError('Role not found');
  }

  if (role.name === ADMIN_ROLE_NAME) {
    throw new BadRequestError('Cannot delete the built-in ADMIN role');
  }

  const deleted = await roleRepository.deleteIfUnassigned(id);
  if (deleted) return;

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
