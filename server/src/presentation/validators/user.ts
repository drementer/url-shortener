import { z } from 'zod';

// null clears the role, which is why the field is nullable rather than optional
const assignRoleSchema = z.object({
  roleId: z.string().trim().min(1, 'Role ID is required').nullable(),
});

export { assignRoleSchema };
