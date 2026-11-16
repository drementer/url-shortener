import { describe, expect, it } from 'bun:test';
import { listAuditLogsQuerySchema } from '../../src/presentation/validators/audit-log';

describe('listAuditLogsQuerySchema', () => {
  it('defaults page and limit when query is empty', () => {
    const parsed = listAuditLogsQuerySchema.parse({});
    expect(parsed).toEqual({ page: 1, limit: 20 });
  });

  it('coerces page, limit, and ISO date filters', () => {
    const parsed = listAuditLogsQuerySchema.parse({
      page: '2',
      limit: '50',
      action: 'auth.login.failed',
      actorId: 'user-1',
      from: '2026-09-01T00:00:00Z',
      to: '2026-09-30T23:59:59Z',
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(50);
    expect(parsed.action).toBe('auth.login.failed');
    expect(parsed.actorId).toBe('user-1');
    expect(parsed.from).toEqual(new Date('2026-09-01T00:00:00Z'));
    expect(parsed.to).toEqual(new Date('2026-09-30T23:59:59Z'));
  });

  it('rejects limit above 100', () => {
    const result = listAuditLogsQuerySchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid date', () => {
    const result = listAuditLogsQuerySchema.safeParse({ from: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('rejects a range where from is after to', () => {
    const result = listAuditLogsQuerySchema.safeParse({
      from: '2026-09-10T00:00:00Z',
      to: '2026-09-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});
