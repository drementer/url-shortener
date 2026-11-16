import roleRepository from '../../infrastructure/repositories/role';
import { ConflictError } from '../../domain/errors';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { recordAuditEvent } from '../audit';
import type { AuditActor } from '../../domain/types';

type CreateRoleCommand = {
  name: string;
  description?: string | null;
  maxActiveLinks?: number | null;
};

const createRole = async (
  { name, description, maxActiveLinks }: CreateRoleCommand,
  actor: AuditActor,
) => {
  const normalizedName = name.trim().toUpperCase();

  const existing = await roleRepository.findByName(normalizedName);
  if (existing) {
    throw new ConflictError(`Role with name '${normalizedName}' already exists`);
  }

  const role = await roleRepository.create({
    name: normalizedName,
    description: description ?? null,
    maxActiveLinks: maxActiveLinks ?? null,
  });

  await recordAuditEvent({
    action: AUDIT_ACTIONS.ROLE_CREATED,
    actorId: actor.id,
    actorEmail: actor.email,
    targetType: 'Role',
    targetId: role.id,
    metadata: {
      name: role.name,
      maxActiveLinks: role.maxActiveLinks,
    },
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  return role;
};

export { createRole };
export type { CreateRoleCommand };
