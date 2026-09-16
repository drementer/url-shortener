import { z } from 'zod';

const createRoleSchema = z.object({
  name: z
    .string({
      error: (issue) =>
        issue.input === undefined ? 'Role name is required' : undefined,
    })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(30, 'Name must be at most 30 characters'),
  description: z.string().trim().max(255).optional().nullable(),
  maxActiveLinks: z.number().int().nonnegative().optional().nullable(),
});

const updateRoleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(30, 'Name must be at most 30 characters')
      .optional(),
    description: z.string().trim().max(255).optional().nullable(),
    maxActiveLinks: z.number().int().nonnegative().optional().nullable(),
  })
  // An empty patch would otherwise run an update that changes nothing and
  // still answer 200, leaving the client unable to tell the two apart
  .refine(
    (body) => Object.keys(body).length > 0,
    'At least one field must be provided',
  );

export { createRoleSchema, updateRoleSchema };
