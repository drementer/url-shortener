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

/** The role is a sub-resource of the user, and the body replaces it outright */
const setRole = async (
  userId: string,
  body: unknown,
  callerRole = 'ADMIN',
) => {
  const caller = await createUser(`caller-${userId}@example.com`, callerRole);

  return await fetch(`${baseUrl}/api/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${getAuthToken(caller, callerRole)}`,
    },
    body: JSON.stringify(body),
  });
};

describe('PUT /api/users/:id/role', () => {
  it('replaces the role and answers with the mapped user', async () => {
    const user = await createUser('promotee@example.com', 'USER');
    const editor = await prisma.role.findUnique({ where: { name: 'EDITOR' } });

    const response = await setRole(user.id, { roleId: editor!.id });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.role.name).toBe('EDITOR');
    expect(Object.keys(body).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'role',
    ]);
  });

  it('clears the role when the body carries null', async () => {
    const user = await createUser('demotee@example.com', 'EDITOR');

    const response = await setRole(user.id, { roleId: null });

    expect(response.status).toBe(200);
    expect((await response.json()).role).toBeNull();
  });

  it('revokes the sessions of the user whose role changed', async () => {
    const user = await createUser('resessioned@example.com', 'USER');
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'hash-that-is-about-to-be-revoked',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const editor = await prisma.role.findUnique({ where: { name: 'EDITOR' } });

    await setRole(user.id, { roleId: editor!.id });

    // A token minted under the old role must not outlive the change
    const live = await prisma.session.count({
      where: { userId: user.id, revokedAt: null },
    });
    expect(live).toBe(0);
  });

  it('answers 404 for a user that does not exist', async () => {
    const editor = await prisma.role.findUnique({ where: { name: 'EDITOR' } });

    const response = await setRole('no-such-user', { roleId: editor!.id });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'User not found' });
  });

  it('answers 404 for a role that does not exist', async () => {
    const user = await createUser('unchanged@example.com', 'USER');

    const response = await setRole(user.id, { roleId: 'no-such-role' });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Role not found' });

    // The rejected assignment must leave the user on the role they had
    const unchanged = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true },
    });
    expect(unchanged?.role?.name).toBe('USER');
  });

  it('rejects a body with no roleId with a field level message', async () => {
    const user = await createUser('nobody-said@example.com', 'USER');

    const response = await setRole(user.id, {});

    expect(response.status).toBe(400);
    expect((await response.json()).details).toEqual([
      { path: 'roleId', message: 'Invalid input: expected string, received undefined' },
    ]);
  });

  it('rejects a non-admin caller with 403', async () => {
    const user = await createUser('target@example.com', 'USER');
    const editor = await prisma.role.findUnique({ where: { name: 'EDITOR' } });

    const response = await setRole(user.id, { roleId: editor!.id }, 'USER');

    expect(response.status).toBe(403);
  });

  it('rejects an unauthenticated caller with 401', async () => {
    const user = await createUser('target@example.com', 'USER');

    const response = await fetch(`${baseUrl}/api/users/${user.id}/role`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roleId: null }),
    });

    expect(response.status).toBe(401);
  });
});
