import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server';
import prisma from '../db/prisma';
import { resetDatabase } from './helpers';

let server: Server;
let baseUrl: string;

let clientCount = 0;

const OFFICE_ADDRESS = '10.3.0.1';

/** Registers an account and hands back its access token */
const registerToken = async (email: string, roleName?: string) => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // The credential routes are limited per address, so each gets its own
      'x-forwarded-for': `10.3.9.${++clientCount}`,
    },
    body: JSON.stringify({ email, password: 'correct horse battery' }),
  });

  const { accessToken, user } = await response.json();

  if (roleName) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (role) {
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: role.id },
      });
    }
  }

  return accessToken as string;
};

const createLink = (accessToken: string) =>
  fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      'x-forwarded-for': OFFICE_ADDRESS,
    },
    body: JSON.stringify({ url: 'https://example.com' }),
  });

beforeAll(async () => {
  await resetDatabase();

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

describe('POST /api/urls rate limit', () => {
  it('counts against the account, not the address it comes from', async () => {
    const heavy = await registerToken('heavy@example.com', 'ADMIN');
    const colleague = await registerToken('colleague@example.com', 'ADMIN');

    // Asserted as an exact boundary, so a quota that regresses is caught too
    for (let attempt = 0; attempt < 10; attempt++) {
      expect((await createLink(heavy)).status).toBe(201);
    }

    const response = await createLink(heavy);

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: 'URL creation limit reached, try again later',
    });

    // Same office, different account: one colleague cannot spend another quota
    const theirs = await createLink(colleague);
    expect(theirs.status).toBe(201);
  });
});
