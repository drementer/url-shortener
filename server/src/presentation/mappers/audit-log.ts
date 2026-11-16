import type { AuditLog, Page, Paged } from '../../domain/types';

/** Shapes an audit log entry into the public admin API representation */
const toAuditLogResponse = (log: AuditLog) => ({
  id: log.id,
  action: log.action,
  actorId: log.actorId,
  actorEmail: log.actorEmail,
  targetType: log.targetType,
  targetId: log.targetId,
  metadata: log.metadata,
  ip: log.ip,
  userAgent: log.userAgent,
  createdAt: log.createdAt,
});

/** The envelope a paged audit log query answers with, meta included */
const toPagedAuditLogsResponse = (
  { items, total }: Paged<AuditLog>,
  { page, limit }: Page,
) => ({
  data: items.map(toAuditLogResponse),
  meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
});

export { toAuditLogResponse, toPagedAuditLogsResponse };
