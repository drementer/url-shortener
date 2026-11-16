import auditLogRepository from '../../infrastructure/repositories/audit-log';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { recordAuditEvent } from './record';
import type { AuditActor, AuditLogFilter, Page } from '../../domain/types';

/** Lists one page of audit log entries matching the supplied filters, newest first */
const findAllAuditLogs = async (
  filter: AuditLogFilter,
  page: Page,
  actor?: AuditActor,
) => {
  const result = await auditLogRepository.findAll(filter, page);

  if (actor) {
    await recordAuditEvent({
      action: AUDIT_ACTIONS.AUDIT_LOGS_VIEWED,
      actorId: actor.id,
      actorEmail: actor.email,
      targetType: 'AuditLog',
      metadata: {
        page: page.page,
        limit: page.limit,
        ...(filter.action ? { action: filter.action } : {}),
        ...(filter.actorId ? { actorId: filter.actorId } : {}),
        ...(filter.from ? { from: filter.from.toISOString() } : {}),
        ...(filter.to ? { to: filter.to.toISOString() } : {}),
      },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
  }

  return result;
};

export { findAllAuditLogs };
