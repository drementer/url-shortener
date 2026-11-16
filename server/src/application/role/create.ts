import roleRepository from '../../infrastructure/repositories/role';
import { ConflictError } from '../../domain/errors';
import type { NewRole } from '../../domain/types';

type CreateRoleCommand = {
  name: string;
  description?: string | null;
  maxActiveLinks?: number | null;
};

const createRole = async ({
  name,
  description,
  maxActiveLinks,
}: CreateRoleCommand) => {
  const normalizedName = name.trim().toUpperCase();

  const existing = await roleRepository.findByName(normalizedName);
  if (existing) {
    throw new ConflictError(`Role with name '${normalizedName}' already exists`);
  }

  return await roleRepository.create({
    name: normalizedName,
    description: description ?? null,
    maxActiveLinks: maxActiveLinks ?? null,
  });
};

export { createRole };
export type { CreateRoleCommand };
