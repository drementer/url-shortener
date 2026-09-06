import roleRepository from '../../repositories/role';
import {
  DEFAULT_ROLE_NAME,
  EDITOR_ROLE_NAME,
  ADMIN_ROLE_NAME,
  DEFAULT_USER_MAX_ACTIVE_LINKS,
  DEFAULT_EDITOR_MAX_ACTIVE_LINKS,
} from '../../domain/role';

const DEFAULT_ROLES = [
  {
    name: DEFAULT_ROLE_NAME,
    description: 'Standard user with basic quota',
    maxActiveLinks: DEFAULT_USER_MAX_ACTIVE_LINKS,
  },
  {
    name: EDITOR_ROLE_NAME,
    description: 'Editor user with expanded link quota',
    maxActiveLinks: DEFAULT_EDITOR_MAX_ACTIVE_LINKS,
  },
  {
    name: ADMIN_ROLE_NAME,
    description: 'Administrator with unlimited quota',
    maxActiveLinks: null,
  },
];

const ensureDefaultRoles = async () => {
  for (const role of DEFAULT_ROLES) {
    const existing = await roleRepository.findByName(role.name);
    if (!existing) {
      await roleRepository.create(role);
    }
  }
};

export { ensureDefaultRoles, DEFAULT_ROLES };
