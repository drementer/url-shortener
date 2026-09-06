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
    const assignRes = await fetch(`${baseUrl}/api/roles/users/${user.id}`, {
      method: 'PATCH',
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
});
