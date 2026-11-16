import roleRepository from '../../infrastructure/repositories/role';
import { ADMIN_ROLE_NAME } from '../../domain/role';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { NotFoundError, ConflictError, BadRequestError } from '../../domain/errors';
import { recordAuditEvent } from '../audit';
import type { AuditActor } from '../../domain/types';

type UpdateRoleCommand = {
  name?: string;
  description?: string | null;
  maxActiveLinks?: number | null;
};

const updateRole = async (
  id: string,
  command: UpdateRoleCommand,
  actor: AuditActor,
) => {
  const existing = await roleRepository.findById(id);
  if (!existing) {
    throw new NotFoundError(`Role not found`);
  }

  const data: UpdateRoleCommand = {};

  if (command.name !== undefined) {
    const normalizedName = command.name.trim().toUpperCase();
    if (existing.name === ADMIN_ROLE_NAME && normalizedName !== ADMIN_ROLE_NAME) {
      throw new BadRequestError('Cannot rename the built-in ADMIN role');
    }

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

  const updated = await roleRepository.update(id, data);

  await recordAuditEvent({
    action: AUDIT_ACTIONS.ROLE_UPDATED,
    actorId: actor.id,
    actorEmail: actor.email,
    targetType: 'Role',
    targetId: updated.id,
    metadata: {
      name: updated.name,
      changes: data,
    },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  return updated;
};

export { updateRole };
export type { UpdateRoleCommand };
