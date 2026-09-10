import type { RoleSummary } from '../types';

/**
 * Shapes a role into the public API contract. Written out field by field for
 * the same reason as the other mappers: a column added to the role table must
 * not reach a client by itself. Takes the summary shape, so it serves a role
 * read on its own and one nested in a user alike.
 */
const toRoleResponse = (role: RoleSummary) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  maxActiveLinks: role.maxActiveLinks,
});

export { toRoleResponse };
