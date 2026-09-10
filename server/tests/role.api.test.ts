import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server';
import prisma from '../db/prisma';
import { createAccessToken } from '../utils/tokens';
import { resetDatabase, createUser } from './helpers';

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

describe('/api/roles access control', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const response = await fetch(`${baseUrl}/api/roles`);
    expect(response.status).toBe(401);
  });

  it('rejects non-admin users with 403', async () => {
    const user = await createUser('regular@example.com', 'USER');
    const token = getAuthToken(user, 'USER');

    const response = await fetch(`${baseUrl}/api/roles`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(403);
  });

  it('allows ADMIN users to list all roles', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const token = getAuthToken(admin, 'ADMIN');

    const response = await fetch(`${baseUrl}/api/roles`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);

    const roles = await response.json();
    const roleNames = roles.map((r: { name: string }) => r.name);
    expect(roleNames).toContain('USER');
    expect(roleNames).toContain('EDITOR');
    expect(roleNames).toContain('ADMIN');
  });

  it('allows ADMIN to create a new role and update it', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const token = getAuthToken(admin, 'ADMIN');

    // Create custom role VIP
    const createRes = await fetch(`${baseUrl}/api/roles`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'VIP',
        description: 'VIP tier',
        maxActiveLinks: 100,
      }),
    });
    expect(createRes.status).toBe(201);
    const createdRole = await createRes.json();
    expect(createdRole.name).toBe('VIP');
    expect(createdRole.maxActiveLinks).toBe(100);

    // Update VIP role limit to 200
    const updateRes = await fetch(`${baseUrl}/api/roles/${createdRole.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        maxActiveLinks: 200,
      }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.maxActiveLinks).toBe(200);
  });

  it('allows ADMIN to assign an EDITOR role to a user, giving them 10 active links', async () => {
    const admin = await createUser('admin@example.com', 'ADMIN');
    const adminToken = getAuthToken(admin, 'ADMIN');

    const user = await createUser('promotee@example.com', 'USER');
    const editorRole = await prisma.role.findUnique({ where: { name: 'EDITOR' } });

    // Promote user to EDITOR
    const assignRes = await fetch(`${baseUrl}/api/users/${user.id}/role`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roleId: editorRole!.id,
      }),
    });
    expect(assignRes.status).toBe(200);
    const updatedUser = await assignRes.json();
    expect(updatedUser.role.name).toBe('EDITOR');
    expect(updatedUser.role.maxActiveLinks).toBe(10);

    // Populate 10 active links for the user directly in database
    for (let i = 1; i <= 10; i++) {
      await prisma.url.create({
        data: {
          shortCode: `editor-fixture-${i}`,
          originalUrl: `https://example.com/editor-url-${i}`,
          userId: user.id,
        },
      });
    }

    // 11th link via API fails with 403 quota exceeded!
    const userToken = getAuthToken(user, 'EDITOR');
    const eleventhRes = await fetch(`${baseUrl}/api/urls`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ url: 'https://example.com/editor-url-11' }),
    });
    expect(eleventhRes.status).toBe(403);
    const err = await eleventhRes.json();
    expect(err.error).toContain('Active link quota exceeded');
  });

  it('rejects attempt to rename the built-in ADMIN role with 400', async () => {
    const admin = await createUser('admin-rename@example.com', 'ADMIN');
    const adminToken = getAuthToken(admin, 'ADMIN');
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });

    const renameRes = await fetch(`${baseUrl}/api/roles/${adminRole!.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'SUPERADMIN' }),
    });

    expect(renameRes.status).toBe(400);
    const body = await renameRes.json();
    expect(body.error).toBe('Cannot rename the built-in ADMIN role');
  });

  it('advertises a created role at the address it can be read from', async () => {
    const admin = await createUser('admin-location@example.com', 'ADMIN');
    const token = getAuthToken(admin, 'ADMIN');

    const response = await fetch(`${baseUrl}/api/roles`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'LOCATED' }),
    });
    const role = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get('location')).toBe(`/api/roles/${role.id}`);
  });

  it('keeps createdAt out of a role response', async () => {
    const admin = await createUser('admin-shape@example.com', 'ADMIN');
    const token = getAuthToken(admin, 'ADMIN');
    const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });

    const response = await fetch(`${baseUrl}/api/roles/${userRole!.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });

    expect(Object.keys(await response.json()).sort()).toEqual([
      'description',
      'id',
      'maxActiveLinks',
      'name',
    ]);
  });

  it('rejects a patch that carries no field with 400', async () => {
    const admin = await createUser('admin-empty@example.com', 'ADMIN');
    const token = getAuthToken(admin, 'ADMIN');
    const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });

    const response = await fetch(`${baseUrl}/api/roles/${userRole!.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'At least one field must be provided',
    });
  });

  it('rejects stale token when an admin user is demoted to a regular role', async () => {
    const superAdmin = await createUser('superadmin@example.com', 'ADMIN');
    const superAdminToken = getAuthToken(superAdmin, 'ADMIN');

    const targetUser = await createUser('demotee@example.com', 'ADMIN');
    const staleAdminToken = getAuthToken(targetUser, 'ADMIN');

    const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });

    // Demote targetUser to USER
    const demoteRes = await fetch(`${baseUrl}/api/users/${targetUser.id}/role`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ roleId: userRole!.id }),
    });
    expect(demoteRes.status).toBe(200);

    // Attempting to access admin-only endpoint with stale token must be rejected with 403
    const forbiddenRes = await fetch(`${baseUrl}/api/roles`, {
      headers: { authorization: `Bearer ${staleAdminToken}` },
    });
    expect(forbiddenRes.status).toBe(403);
  });
});

describe('DELETE /api/roles/:id', () => {
  const removeRole = async (id: string, roleName = 'ADMIN') => {
    const admin = await createUser(`deleter-${id}@example.com`, roleName);

    return await fetch(`${baseUrl}/api/roles/${id}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${getAuthToken(admin, roleName)}` },
    });
  };

  it('removes a role nothing depends on and answers 204', async () => {
    const role = await prisma.role.create({ data: { name: 'DISPOSABLE' } });

    const response = await removeRole(role.id);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(await prisma.role.findUnique({ where: { id: role.id } })).toBeNull();
  });

  it('refuses the built-in ADMIN role', async () => {
    const role = await prisma.role.findUnique({ where: { name: 'ADMIN' } });

    const response = await removeRole(role!.id);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Cannot delete the built-in ADMIN role',
    });
    // Refusing is only worth anything if the row is still there afterwards
    expect(await prisma.role.count({ where: { id: role!.id } })).toBe(1);
  });

  it('refuses a role that is still assigned to someone', async () => {
    const role = await prisma.role.findUnique({ where: { name: 'USER' } });
    await createUser('still-holding@example.com', 'USER');

    const response = await removeRole(role!.id);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Role is still assigned to 1 user(s)',
    });
  });

  it('answers 404 for a role that does not exist', async () => {
    const response = await removeRole('no-such-role');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Role not found' });
  });

  it('rejects a non-admin caller with 403', async () => {
    const role = await prisma.role.create({ data: { name: 'GUARDED' } });

    const response = await removeRole(role.id, 'USER');

    expect(response.status).toBe(403);
    expect(await prisma.role.count({ where: { id: role.id } })).toBe(1);
  });
});
