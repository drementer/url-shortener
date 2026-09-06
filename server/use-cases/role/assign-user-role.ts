import userRepository from '../../repositories/user';
import roleRepository from '../../repositories/role';
import { NotFoundError } from '../../errors';

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

  return await userRepository.updateRole(userId, roleId);
};

export { assignUserRole };
