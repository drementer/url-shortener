import roleRepository from '../../infrastructure/repositories/role';
import { NotFoundError } from '../../domain/errors';

const findRoleById = async (id: string) => {
  const role = await roleRepository.findById(id);
  if (!role) {
    throw new NotFoundError(`Role not found`);
  }
  return role;
};

export { findRoleById };
