import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../../src/server';
import auditPrisma from '../../src/infrastructure/db/audit';
import { createAccessToken } from '../../src/infrastructure/crypto/tokens';
import { resetDatabase, createUser } from '../helpers';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

beforeEach(resetDatabase);

const getAuthToken = (user: { id: string; email: string }, roleName?: string) =>
  createAccessToken({
    sub: user.id,
    email: user.email,
    ...(roleName ? { role: roleName } : {}),
  });

describe('GET /api/v1/audit-logs access control', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const response = await fetch(`${baseUrl}/api/v1/audit-logs`);
    expect(response.status).toBe(401);
  });

  it('rejects non-admin users with 403', async () => {
    const user = await createUser('user@example.com', 'USER');
    const token = getAuthToken(user, 'USER');

    const response = await fetch(`${baseUrl}/api/v1/audit-logs`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(403);
  });

  it('returns paged audit logs newest first for ADMIN', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const token = getAuthToken(admin, 'ADMIN');

    await auditPrisma.auditLog.createMany({
      data: [
        {
          action: 'auth.register',
          actorId: 'u1',
          actorEmail: 'one@example.com',
          createdAt: new Date('2026-09-01T10:00:00Z'),
        },
        {
          action: 'auth.login.failed',
          actorId: null,
          actorEmail: 'two@example.com',
          createdAt: new Date('2026-09-01T11:00:00Z'),
        },
        {
          action: 'role.created',
          actorId: admin.id,
          actorEmail: admin.email,
          targetType: 'Role',
          targetId: 'r1',
          metadata: JSON.stringify({ name: 'VIP' }),
          createdAt: new Date('2026-09-01T12:00:00Z'),
        },
      ],
    });

    const response = await fetch(`${baseUrl}/api/v1/audit-logs?limit=2&page=1`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(body.data.map((d: { action: string }) => d.action)).toEqual([
      'role.created',
      'auth.login.failed',
    ]);
    expect(body.data[0].metadata).toEqual({ name: 'VIP' });
  });

  it('filters by action, actorId, and date range', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const token = getAuthToken(admin, 'ADMIN');

    await auditPrisma.auditLog.createMany({
      data: [
        {
          action: 'auth.login.failed',
          actorId: null,
          actorEmail: 'attacker@example.com',
          createdAt: new Date('2026-09-01T10:00:00Z'),
        },
        {
          action: 'role.created',
          actorId: 'other-admin-1',
          actorEmail: 'other-admin@example.com',
          createdAt: new Date('2026-09-02T10:00:00Z'),
        },
      ],
    });

    const actionRes = await fetch(
      `${baseUrl}/api/v1/audit-logs?action=auth.login.failed`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    expect(actionRes.status).toBe(200);
    const actionBody = await actionRes.json();
    expect(actionBody.meta.total).toBe(1);
    expect(actionBody.data[0].actorEmail).toBe('attacker@example.com');

    const actorRes = await fetch(
      `${baseUrl}/api/v1/audit-logs?actorId=other-admin-1`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    expect(actorRes.status).toBe(200);
    const actorBody = await actorRes.json();
    expect(actorBody.meta.total).toBe(1);
    expect(actorBody.data[0].action).toBe('role.created');

    const rangeRes = await fetch(
      `${baseUrl}/api/v1/audit-logs?from=2026-09-02T00:00:00Z&to=2026-09-03T00:00:00Z`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    expect(rangeRes.status).toBe(200);
    const rangeBody = await rangeRes.json();
    expect(rangeBody.meta.total).toBe(1);
    expect(rangeBody.data[0].action).toBe('role.created');
  });

  it('rejects invalid query parameters with 400', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const token = getAuthToken(admin, 'ADMIN');

    const response = await fetch(`${baseUrl}/api/v1/audit-logs?limit=101`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(400);
  });
});

describe('audit events emitted end-to-end', () => {
  it('records auth lifecycle events across register, failed login, login, refresh replay, and logout', async () => {
    const email = 'trail@example.com';
    const password = 'correct horse battery';

    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'audit-test-agent',
      },
      body: JSON.stringify({ email, password }),
    });
    expect(regRes.status).toBe(201);
    const regBody = await regRes.json();

    const failRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrong password here' }),
    });
    expect(failRes.status).toBe(401);

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();

    const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: loginBody.refreshToken }),
    });
    expect(refreshRes.status).toBe(200);

    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: regBody.refreshToken }),
    });
    expect(logoutRes.status).toBe(204);

    // Replay retired refresh token -> auth.refresh.reused
    const replayRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: loginBody.refreshToken }),
    });
    expect(replayRes.status).toBe(401);

    const logs = await auditPrisma.auditLog.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    expect(logs.map((l) => l.action)).toEqual([
      'auth.register',
      'auth.login.failed',
      'auth.login.succeeded',
      'auth.logout',
      'auth.refresh.reused',
    ]);

    const failed = logs.find((l) => l.action === 'auth.login.failed');
    expect(failed?.actorId).toBeNull();
    expect(failed?.actorEmail).toBe(email);

    const registered = logs.find((l) => l.action === 'auth.register');
    expect(registered?.actorId).toBe(regBody.user.id);
    expect(registered?.userAgent).toBe('audit-test-agent');
  });

  it('records role CRUD and user role assignment events with the admin actor', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const adminToken = getAuthToken(admin, 'ADMIN');
    const targetUser = await createUser('target@example.com', 'USER');

    const createRes = await fetch(`${baseUrl}/api/v1/roles`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
        'user-agent': 'admin-browser',
      },
      body: JSON.stringify({ name: 'VIP', maxActiveLinks: 50 }),
    });
    expect(createRes.status).toBe(201);
    const createdRole = await createRes.json();

    const patchRes = await fetch(`${baseUrl}/api/v1/roles/${createdRole.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ maxActiveLinks: 75 }),
    });
    expect(patchRes.status).toBe(200);

    const assignRes = await fetch(`${baseUrl}/api/v1/users/${targetUser.id}/role`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ roleId: createdRole.id }),
    });
    expect(assignRes.status).toBe(200);

    // Clear targetUser's role so VIP can be deleted
    await fetch(`${baseUrl}/api/v1/users/${targetUser.id}/role`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ roleId: null }),
    });

    const deleteRes = await fetch(`${baseUrl}/api/v1/roles/${createdRole.id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(deleteRes.status).toBe(204);

    const listRes = await fetch(`${baseUrl}/api/v1/audit-logs`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.status).toBe(200);
    const { data } = await listRes.json();

    expect(data.map((d: { action: string }) => d.action)).toEqual([
      'role.deleted',
      'user.role.assigned',
      'user.role.assigned',
      'role.updated',
      'role.created',
    ]);

    const roleCreatedEvent = data.find(
      (d: { action: string }) => d.action === 'role.created',
    );
    expect(roleCreatedEvent.actorId).toBe(admin.id);
    expect(roleCreatedEvent.actorEmail).toBe(admin.email);
    expect(roleCreatedEvent.targetType).toBe('Role');
    expect(roleCreatedEvent.targetId).toBe(createdRole.id);
    expect(roleCreatedEvent.userAgent).toBe('admin-browser');
    expect(roleCreatedEvent.metadata).toEqual({ name: 'VIP', maxActiveLinks: 50 });
  });

  it('records url.created and url.deleted with link details', async () => {
    const user = await createUser('links@example.com', 'USER');
    const token = getAuthToken(user, 'USER');

    const createRes = await fetch(`${baseUrl}/api/v1/urls`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'user-agent': 'link-client',
      },
      body: JSON.stringify({
        url: 'https://example.com/secret-doc',
        customSlug: 'my-doc',
      }),
    });
    expect(createRes.status).toBe(201);

    const deleteRes = await fetch(`${baseUrl}/api/v1/urls/my-doc`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`,
        'user-agent': 'link-client',
      },
    });
    expect(deleteRes.status).toBe(204);

    // Deleting a non-existent code should not emit url.deleted
    const missingRes = await fetch(`${baseUrl}/api/v1/urls/missing`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(missingRes.status).toBe(404);

    const logs = await auditPrisma.auditLog.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    expect(logs.map((l) => l.action)).toEqual(['url.created', 'url.deleted']);
    expect(logs[0]?.actorId).toBe(user.id);
    expect(logs[0]?.actorEmail).toBe(user.email);
    expect(logs[0]?.targetType).toBe('Url');
    expect(logs[0]?.userAgent).toBe('link-client');
    expect(JSON.parse(logs[0]!.metadata!)).toEqual({
      shortCode: 'my-doc',
      originalUrl: 'https://example.com/secret-doc',
      customSlug: 'my-doc',
    });

    expect(logs[1]?.targetType).toBe('Url');
    expect(logs[1]?.targetId).toBe(logs[0]?.targetId);
    expect(JSON.parse(logs[1]!.metadata!)).toEqual({
      shortCode: 'my-doc',
      originalUrl: 'https://example.com/secret-doc',
    });
  });

  it('records auth.access.denied for forbidden admin routes and audit.logs.viewed when an admin queries logs', async () => {
    const user = await createUser('regular@example.com', 'USER');
    const userToken = getAuthToken(user, 'USER');
    const admin = await createUser('boss@example.com', 'ADMIN');
    const adminToken = getAuthToken(admin, 'ADMIN');

    const deniedRes = await fetch(
      `${baseUrl}/api/v1/audit-logs?action=auth.login.failed`,
      {
        headers: {
          authorization: `Bearer ${userToken}`,
          'user-agent': 'curious-user',
        },
      },
    );
    expect(deniedRes.status).toBe(403);

    const viewRes = await fetch(
      `${baseUrl}/api/v1/audit-logs?action=auth.access.denied&page=1&limit=10`,
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
          'user-agent': 'admin-console',
        },
      },
    );
    expect(viewRes.status).toBe(200);
    const viewBody = await viewRes.json();
    expect(viewBody.meta.total).toBe(1);
    expect(viewBody.data[0].action).toBe('auth.access.denied');

    const logs = await auditPrisma.auditLog.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(logs.map((l) => l.action)).toEqual([
      'auth.access.denied',
      'audit.logs.viewed',
    ]);

    expect(logs[0]?.actorId).toBe(user.id);
    expect(logs[0]?.targetType).toBe('Route');
    expect(logs[0]?.targetId).toBe('GET /api/v1/audit-logs');
    expect(JSON.parse(logs[0]!.metadata!)).toEqual({
      allowedRoles: ['ADMIN'],
      actualRole: 'USER',
    });

    expect(logs[1]?.actorId).toBe(admin.id);
    expect(logs[1]?.targetType).toBe('AuditLog');
    expect(JSON.parse(logs[1]!.metadata!)).toEqual({
      page: 1,
      limit: 10,
      action: 'auth.access.denied',
    });
  });
});
