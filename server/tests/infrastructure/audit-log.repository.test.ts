import { describe, expect, it, beforeEach } from 'bun:test';
import auditLogRepository from '../../src/infrastructure/repositories/audit-log';
import auditPrisma, { auditDatabaseUrl } from '../../src/infrastructure/db/audit';
import { resetDatabase } from '../helpers';

beforeEach(resetDatabase);

describe('auditLogRepository', () => {
  it('uses a dedicated Prisma SQLite database separate from DATABASE_URL', () => {
    expect(auditDatabaseUrl).toContain('audit-test.db');
    expect(auditDatabaseUrl).not.toBe(process.env.DATABASE_URL);
  });

  it('stores an audit entry and parses JSON metadata back to an object', async () => {
    const created = await auditLogRepository.create({
      action: 'role.created',
      actorId: 'actor-1',
      actorEmail: 'admin@example.com',
      targetType: 'Role',
      targetId: 'role-1',
      metadata: { name: 'VIP', maxActiveLinks: 50 },
      ip: '203.0.113.10',
      userAgent: 'bun-test',
    });

    expect(created.id).toBeString();
    expect(created.action).toBe('role.created');
    expect(created.actorId).toBe('actor-1');
    expect(created.actorEmail).toBe('admin@example.com');
    expect(created.targetType).toBe('Role');
    expect(created.targetId).toBe('role-1');
    expect(created.metadata).toEqual({ name: 'VIP', maxActiveLinks: 50 });
    expect(created.ip).toBe('203.0.113.10');
    expect(created.userAgent).toBe('bun-test');
    expect(created.createdAt).toBeDate();

    const stored = await auditPrisma.auditLog.findUnique({
      where: { id: created.id },
    });
    expect(stored?.metadata).toBe(
      JSON.stringify({ name: 'VIP', maxActiveLinks: 50 }),
    );
  });

  it('defaults omitted optional fields to null', async () => {
    const created = await auditLogRepository.create({
      action: 'auth.login.failed',
      actorEmail: 'nobody@example.com',
    });

    expect(created.actorId).toBeNull();
    expect(created.targetType).toBeNull();
    expect(created.targetId).toBeNull();
    expect(created.metadata).toBeNull();
    expect(created.ip).toBeNull();
    expect(created.userAgent).toBeNull();
  });

  it('orders results newest first and paginates with total count', async () => {
    await auditPrisma.auditLog.create({
      data: {
        action: 'auth.register',
        actorId: 'u1',
        createdAt: new Date('2026-09-01T10:00:00Z'),
      },
    });
    await auditPrisma.auditLog.create({
      data: {
        action: 'auth.login.succeeded',
        actorId: 'u1',
        createdAt: new Date('2026-09-01T11:00:00Z'),
      },
    });
    await auditPrisma.auditLog.create({
      data: {
        action: 'auth.logout',
        actorId: 'u1',
        createdAt: new Date('2026-09-01T12:00:00Z'),
      },
    });

    const page1 = await auditLogRepository.findAll({}, { page: 1, limit: 2 });
    expect(page1.total).toBe(3);
    expect(page1.items.map((i) => i.action)).toEqual([
      'auth.logout',
      'auth.login.succeeded',
    ]);

    const page2 = await auditLogRepository.findAll({}, { page: 2, limit: 2 });
    expect(page2.total).toBe(3);
    expect(page2.items.map((i) => i.action)).toEqual(['auth.register']);
  });

  it('filters by action, actorId, and date range', async () => {
    await auditPrisma.auditLog.create({
      data: {
        action: 'auth.login.failed',
        actorId: null,
        actorEmail: 'x@example.com',
        createdAt: new Date('2026-09-01T08:00:00Z'),
      },
    });
    await auditPrisma.auditLog.create({
      data: {
        action: 'role.created',
        actorId: 'admin-1',
        createdAt: new Date('2026-09-02T08:00:00Z'),
      },
    });
    await auditPrisma.auditLog.create({
      data: {
        action: 'role.created',
        actorId: 'admin-2',
        createdAt: new Date('2026-09-05T08:00:00Z'),
      },
    });

    const byAction = await auditLogRepository.findAll(
      { action: 'role.created' },
      { page: 1, limit: 20 },
    );
    expect(byAction.total).toBe(2);

    const byActor = await auditLogRepository.findAll(
      { actorId: 'admin-1' },
      { page: 1, limit: 20 },
    );
    expect(byActor.total).toBe(1);
    expect(byActor.items[0]?.action).toBe('role.created');

    const byWindow = await auditLogRepository.findAll(
      {
        from: new Date('2026-09-01T12:00:00Z'),
        to: new Date('2026-09-03T00:00:00Z'),
      },
      { page: 1, limit: 20 },
    );
    expect(byWindow.total).toBe(1);
    expect(byWindow.items[0]?.actorId).toBe('admin-1');
  });

  it('exposes only append-only methods (no update or delete)', () => {
    expect(auditLogRepository).not.toHaveProperty('update');
    expect(auditLogRepository).not.toHaveProperty('delete');
  });
});
