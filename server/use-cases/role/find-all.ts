import roleRepository from '../../repositories/role';

const findAllRoles = async () => {
  return await roleRepository.findAll();
};

export { findAllRoles };
