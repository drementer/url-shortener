import roleRepository from '../../infrastructure/repositories/role';

const findAllRoles = async () => {
  return await roleRepository.findAll();
};

export { findAllRoles };
