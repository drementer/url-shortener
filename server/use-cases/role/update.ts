import roleRepository from '../../repositories/role';
import { NotFoundError, ConflictError } from '../../errors';

type UpdateRoleCommand = {
  name?: string;
  description?: string | null;
  maxActiveLinks?: number | null;
};

const updateRole = async (id: string, command: UpdateRoleCommand) => {
  const existing = await roleRepository.findById(id);
  if (!existing) {
    throw new NotFoundError(`Role not found`);
  }

  const data: UpdateRoleCommand = {};

  if (command.name !== undefined) {
    const normalizedName = command.name.trim().toUpperCase();
    if (normalizedName !== existing.name) {
      const duplicate = await roleRepository.findByName(normalizedName);
      if (duplicate) {
        throw new ConflictError(
          `Role with name '${normalizedName}' already exists`,
        );
      }
    }
    data.name = normalizedName;
  }

  if (command.description !== undefined) {
    data.description = command.description;
  }

  if (command.maxActiveLinks !== undefined) {
    data.maxActiveLinks = command.maxActiveLinks;
  }

  return await roleRepository.update(id, data);
};

export { updateRole };
export type { UpdateRoleCommand };
