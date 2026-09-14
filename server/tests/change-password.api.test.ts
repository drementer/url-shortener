import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server';
import prisma from '../db/prisma';
import mailer from '../services/mailer';

let server: Server;
let baseUrl: string;

const PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'a different horse entirely';

let clientCount = 0;

/**
 * Every request claims its own address. The password routes allow 10 attempts
 * per 15 minutes and the whole file shares one limiter, so tests coming from a
 * single address would start answering 429 halfway through.
 */
const headers = (accessToken?: string) => ({
  'content-type': 'application/json',
  'x-forwarded-for': `10.2.0.${++clientCount}`,
  ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
});

const post = (path: string, body: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

const changePassword = (
  accessToken: string,
  body: unknown = { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
) =>
  fetch(`${baseUrl}/api/v1/auth/password`, {
    method: 'PATCH',
    headers: headers(accessToken),
    body: JSON.stringify(body),
  });

const login = (email: string, password: string) =>
  post('/api/v1/auth/login', { email, password });

/** Registers an account and hands back the session it was given */
const registerSession = async (email: string) => {
  const response = await post('/api/v1/auth/register', {
    email,
    password: PASSWORD,
  });

  return await response.json();
};

beforeAll(async () => {
  await prisma.click.deleteMany();
  await prisma.url.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();

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

describe('PATCH /api/v1/auth/password', () => {
  it('sets the new password and refuses the old one', async () => {
    const email = 'change@example.com';
    const { accessToken } = await registerSession(email);

    const response = await changePassword(accessToken);

    expect(response.status).toBe(200);
    expect((await login(email, NEW_PASSWORD)).status).toBe(200);
    expect((await login(email, PASSWORD)).status).toBe(401);
  });

  it('hands back a working replacement for the revoked session', async () => {
    const { accessToken } = await registerSession('replacement@example.com');

    const session = await (await changePassword(accessToken)).json();

    expect(Object.keys(session).sort()).toEqual([
      'accessToken',
      'expiresIn',
      'refreshToken',
      'user',
    ]);

    const refreshed = await post('/api/v1/auth/refresh', {
      refreshToken: session.refreshToken,
    });
    expect(refreshed.status).toBe(200);
  });

  it('revokes the sessions the account already had open', async () => {
    const email = 'other-devices@example.com';
    // The account signs in twice, so the change has another device to cut off
    const { refreshToken } = await registerSession(email);
    const { accessToken } = await (await login(email, PASSWORD)).json();

    await changePassword(accessToken);

    const response = await post('/api/v1/auth/refresh', { refreshToken });
    expect(response.status).toBe(401);
  });

  it('retires a reset link that was still outstanding', async () => {
    const email = 'outstanding@example.com';
    let mailedToken = '';
    mailer.sendPasswordReset = async (_to: string, token: string) => {
      mailedToken = token;
    };

    const { accessToken } = await registerSession(email);
    await post('/api/v1/auth/password/forgot', { email });
    await changePassword(accessToken);

    const response = await post('/api/v1/auth/password/reset', {
      token: mailedToken,
      password: 'yet another password',
    });

    expect(response.status).toBe(400);
  });

  it('refuses a wrong current password', async () => {
    const { accessToken } = await registerSession('wrong@example.com');

    const response = await changePassword(accessToken, {
      currentPassword: 'not the one on file',
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Current password is incorrect',
    });
  });

  it('leaves the password alone when the current one is wrong', async () => {
    const email = 'untouched@example.com';
    const { accessToken } = await registerSession(email);

    await changePassword(accessToken, {
      currentPassword: 'not the one on file',
      newPassword: NEW_PASSWORD,
    });

    expect((await login(email, PASSWORD)).status).toBe(200);
  });

  it('refuses a new password identical to the current one', async () => {
    const { accessToken } = await registerSession('same@example.com');

    const response = await changePassword(accessToken, {
      currentPassword: PASSWORD,
      newPassword: PASSWORD,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'New password must be different from the current one',
      details: [
        {
          path: 'newPassword',
          message: 'New password must be different from the current one',
        },
      ],
    });
  });

  it('holds the new password to the same rules as registration', async () => {
    const { accessToken } = await registerSession('weak-change@example.com');

    const response = await changePassword(accessToken, {
      currentPassword: PASSWORD,
      newPassword: 'short',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Password must be at least 8 characters',
      details: [
        {
          path: 'newPassword',
          message: 'Password must be at least 8 characters',
        },
      ],
    });
  });

  it('rejects a request with no current password', async () => {
    const { accessToken } = await registerSession('no-current@example.com');

    const response = await changePassword(accessToken, {
      newPassword: NEW_PASSWORD,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Current password is required',
      details: [
        { path: 'currentPassword', message: 'Current password is required' },
      ],
    });
  });

  it('rejects a request carrying no access token', async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/password`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }),
    });

    expect(response.status).toBe(401);
  });
});
