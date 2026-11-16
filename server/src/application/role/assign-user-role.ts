import userRepository from '../../infrastructure/repositories/user';
import roleRepository from '../../infrastructure/repositories/role';
import sessionRepository from '../../infrastructure/repositories/session';
import { NotFoundError } from '../../domain/errors';

const assignUserRole = async (userId: string, roleId: string | null) => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (roleId !== null) {
    const role = await roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
  }

  const updatedUser = await userRepository.updateRole(userId, roleId);
  await sessionRepository.revokeAllForUser(userId);
  return updatedUser;
};

export { assignUserRole };
