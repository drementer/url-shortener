import { z } from 'zod';

const createRoleSchema = z.object({
  name: z
    .string({ required_error: 'Role name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(30, 'Name must be at most 30 characters'),
  description: z.string().trim().max(255).optional().nullable(),
  maxActiveLinks: z.number().int().nonnegative().optional().nullable(),
});

const updateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(30, 'Name must be at most 30 characters')
    .optional(),
  description: z.string().trim().max(255).optional().nullable(),
  maxActiveLinks: z.number().int().nonnegative().optional().nullable(),
});

const assignRoleSchema = z.object({
  roleId: z.string().trim().min(1, 'Role ID is required').nullable(),
});

export { createRoleSchema, updateRoleSchema, assignRoleSchema };
