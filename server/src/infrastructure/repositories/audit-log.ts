import type { Prisma } from '@prisma/audit-client';
import auditPrisma from '../db/audit';
import type { AuditLogRepository } from '../../application/ports';
import type { AuditLog } from '../../domain/types';

const parseMetadata = (raw: string | null): Record<string, unknown> | null => {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toDomain = (row: {
  id: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}): AuditLog => ({
  id: row.id,
  action: row.action,
  actorId: row.actorId,
  actorEmail: row.actorEmail,
  targetType: row.targetType,
  targetId: row.targetId,
  metadata: parseMetadata(row.metadata),
  ip: row.ip,
  userAgent: row.userAgent,
  createdAt: row.createdAt,
});

/**
 * Append-only storage for audit events backed by its own Prisma SQLite database.
 * Updates and deletes are intentionally absent so recorded history cannot be
 * altered through the repository.
 */
const auditLogRepository: AuditLogRepository = {
  async create(entry) {
    const row = await auditPrisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });

    return toDomain(row);
  },

  async findAll(filter, { page, limit }) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filter.action) where.action = filter.action;
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.from || filter.to) {
      where.createdAt = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      auditPrisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      auditPrisma.auditLog.count({ where }),
    ]);

    return { items: rows.map(toDomain), total };
  },
};

export default auditLogRepository;
