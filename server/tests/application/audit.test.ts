import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { recordAuditEvent, findAllAuditLogs } from '../../src/application/audit';
import auditLogRepository from '../../src/infrastructure/repositories/audit-log';
import { resetDatabase } from '../helpers';

beforeEach(resetDatabase);

describe('recordAuditEvent', () => {
  it('writes the entry to the audit repository', async () => {
    await recordAuditEvent({
      action: 'role.created',
      actorId: 'admin-1',
      actorEmail: 'admin@example.com',
      targetType: 'Role',
      targetId: 'role-1',
    });

    const result = await findAllAuditLogs({}, { page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.action).toBe('role.created');
  });

  it('swallows repository failures and logs them instead of crashing the caller', async () => {
    const createSpy = spyOn(auditLogRepository, 'create').mockRejectedValue(
      new Error('SQLITE_BUSY'),
    );
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(
        recordAuditEvent({ action: 'auth.login.succeeded', actorId: 'u1' }),
      ).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalledTimes(1);
    } finally {
      createSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
