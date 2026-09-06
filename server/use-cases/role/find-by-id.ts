import roleRepository from '../../repositories/role';
import { NotFoundError } from '../../errors';

const findRoleById = async (id: string) => {
  const role = await roleRepository.findById(id);
  if (!role) {
    throw new NotFoundError(`Role not found`);
  }
  return role;
};

export { findRoleById };
