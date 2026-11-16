import auditLogRepository from '../../infrastructure/repositories/audit-log';
import type { NewAuditLog } from '../../domain/types';

/**
 * Records a security or admin audit event. Never throws: a failure in the
 * audit log table must not abort or fail the user-facing request.
 */
const recordAuditEvent = async (entry: NewAuditLog): Promise<void> => {
  try {
    await auditLogRepository.create(entry);
  } catch (error) {
    console.error('Failed to record audit event', {
      action: entry.action,
      error,
    });
  }
};

export { recordAuditEvent };
