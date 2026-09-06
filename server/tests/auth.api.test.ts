import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server';
import prisma from '../db/prisma';

let server: Server;
let baseUrl: string;

const PASSWORD = 'correct horse battery';

let clientCount = 0;

/**
 * Every request claims its own address. The credential routes allow 10 attempts
 * per 15 minutes and the whole file shares one limiter, so tests coming from a
 * single address would start answering 429 halfway through.
 */
const headers = (forwardedFor = `10.0.0.${++clientCount}`) => ({
  'content-type': 'application/json',
  'x-forwarded-for': forwardedFor,
});

const post = (path: string, body: unknown, forwardedFor?: string) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: headers(forwardedFor),
    body: JSON.stringify(body),
  });

const register = (email: string, password = PASSWORD) =>
  post('/api/auth/register', { email, password });

/** Registers an account and hands back the session it was given */
const registerSession = async (email: string) => {
  const response = await register(email);

  return await response.json();
};

const createLink = (accessToken: string, customSlug: string) =>
  fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: { ...headers(), authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ url: 'https://example.com', customSlug }),
  });

beforeAll(async () => {
  await prisma.click.deleteMany();
  await prisma.url.deleteMany();
  await prisma.session.deleteMany();
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

describe('POST /api/auth/register', () => {
  it('answers with the account and a token pair', async () => {
    const response = await register('register@example.com');
    const session = await response.json();

    expect(response.status).toBe(201);
    expect(Object.keys(session).sort()).toEqual([
      'accessToken',
      'expiresIn',
      'refreshToken',
      'user',
    ]);
    expect(Object.keys(session.user).sort()).toEqual([
      'createdAt',
      'email',
      'id',
      'role',
    ]);
    expect(session.expiresIn).toBeGreaterThan(0);
  });

  it('stores the email lowercased', async () => {
    const response = await register('Mixed.Case@Example.com');
    const { user } = await response.json();

    expect(user.email).toBe('mixed.case@example.com');
  });

  it('accepts an address that was pasted with a stray space', async () => {
    const response = await register('  Spaced@Example.COM  ');
    const { user } = await response.json();

    expect(response.status).toBe(201);
    expect(user.email).toBe('spaced@example.com');
  });

  it('rejects a password below the minimum length', async () => {
    const response = await register('short@example.com', 'short');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Password must be at least 8 characters',
    });
  });

  it('rejects a request with no password', async () => {
    const response = await post('/api/auth/register', {
      email: 'nopassword@example.com',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'A password is required',
    });
  });

  it('rejects a malformed email', async () => {
    const response = await register('not-an-email');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'A valid email is required',
    });
  });

  it('answers 409 when the email is taken, whatever the casing', async () => {
    await register('taken@example.com');

    const response = await register('TAKEN@example.com');

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'This email is already registered',
    });
  });
});

describe('POST /api/auth/login', () => {
  it('starts a new session for the right password', async () => {
    await register('login@example.com');

    const response = await post('/api/auth/login', {
      email: 'login@example.com',
      password: PASSWORD,
    });
    const session = await response.json();

    expect(response.status).toBe(200);
    expect(session.user.email).toBe('login@example.com');
    expect(session.accessToken).toBeString();
  });

  it('answers the same for a wrong password and an unknown email', async () => {
    await register('known@example.com');

    const wrongPassword = await post('/api/auth/login', {
      email: 'known@example.com',
      password: 'wrong password entirely',
    });
    const unknownEmail = await post('/api/auth/login', {
      email: 'nobody@example.com',
      password: PASSWORD,
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    // Identical, so the response cannot reveal which emails are registered
    expect(await wrongPassword.json()).toEqual({
      error: 'Invalid email or password',
    });
    expect(await unknownEmail.json()).toEqual({
      error: 'Invalid email or password',
    });
  });

  it('answers 429 once an address has burnt its attempts', async () => {
    const attacker = '10.9.9.9';
    const attempt = () =>
      post(
        '/api/auth/login',
        { email: 'known@example.com', password: 'wrong password entirely' },
        attacker,
      );

    let response = await attempt();
    for (let tries = 0; tries < 12 && response.status !== 429; tries++) {
      response = await attempt();
    }

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: 'Too many attempts, please try again later',
    });
  });
});

describe('GET /api/auth/me', () => {
  it('answers with the account behind the access token', async () => {
    const { accessToken } = await registerSession('me@example.com');

    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ email: 'me@example.com' });
  });

  it('answers 401 without a token', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required' });
  });

  it('answers 401 for a token that does not verify', async () => {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { authorization: 'Bearer not-a-real-token' },
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Invalid or expired token',
    });
  });
});

describe('POST /api/auth/refresh', () => {
  it('hands out a new pair and retires the token it was given', async () => {
    const session = await registerSession('refresh@example.com');

    const response = await post('/api/auth/refresh', {
      refreshToken: session.refreshToken,
    });
    const refreshed = await response.json();

    const replay = await post('/api/auth/refresh', {
      refreshToken: session.refreshToken,
    });

    expect(response.status).toBe(200);
    expect(refreshed.refreshToken).not.toBe(session.refreshToken);
    expect(replay.status).toBe(401);
    expect(await replay.json()).toEqual({ error: 'Invalid refresh token' });
  });

  it('ends every session when a retired token comes back', async () => {
    const session = await registerSession('replay@example.com');

    const refreshed = await post('/api/auth/refresh', {
      refreshToken: session.refreshToken,
    });
    const { refreshToken: rotated } = await refreshed.json();

    // The leaked token surfacing again invalidates the chain it came from
    await post('/api/auth/refresh', { refreshToken: session.refreshToken });

    const response = await post('/api/auth/refresh', { refreshToken: rotated });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Invalid refresh token' });
  });

  it('lets only one of two simultaneous exchanges through', async () => {
    const session = await registerSession('race@example.com');

    const [first, second] = await Promise.all([
      post('/api/auth/refresh', { refreshToken: session.refreshToken }),
      post('/api/auth/refresh', { refreshToken: session.refreshToken }),
    ]);

    const accepted = [first, second].filter((r) => r.status === 200);
    expect(accepted).toHaveLength(1);

    // The losing request is holding a copy of the token, which ends the chain
    const user = await prisma.user.findUnique({
      where: { email: 'race@example.com' },
    });
    const live = await prisma.session.count({
      where: { userId: user!.id, revokedAt: null },
    });
    expect(live).toBe(0);
  });

  it('answers 400 when no refresh token is sent', async () => {
    const response = await post('/api/auth/refresh', {});

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Refresh token is required',
    });
  });
});

describe('POST /api/auth/logout', () => {
  it('ends the session behind the refresh token', async () => {
    const session = await registerSession('logout@example.com');

    const response = await post('/api/auth/logout', {
      refreshToken: session.refreshToken,
    });
    const afterwards = await post('/api/auth/refresh', {
      refreshToken: session.refreshToken,
    });

    expect(response.status).toBe(200);
    expect(afterwards.status).toBe(401);
  });

  it('answers the same for a token it does not know', async () => {
    const response = await post('/api/auth/logout', {
      refreshToken: 'a token that was never issued',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: 'Logged out successfully',
    });
  });
});

describe('link ownership', () => {
  it('hides the links of another account', async () => {
    const owner = await registerSession('owner@example.com');
    const stranger = await registerSession('stranger@example.com');

    await createLink(owner.accessToken, 'owned-fixture');

    const strangerHeaders = {
      authorization: `Bearer ${stranger.accessToken}`,
    };
    const stats = await fetch(`${baseUrl}/api/urls/owned-fixture`, {
      headers: strangerHeaders,
    });
    const removal = await fetch(`${baseUrl}/api/urls/owned-fixture`, {
      method: 'DELETE',
      headers: strangerHeaders,
    });
    const listing = await fetch(`${baseUrl}/api/urls`, {
      headers: strangerHeaders,
    });

    // 404 rather than 403, so short codes cannot be probed for existence
    expect(stats.status).toBe(404);
    expect(removal.status).toBe(404);
    expect(await listing.json()).toEqual([]);

    // The link itself is untouched, the stranger only failed to reach it
    const surviving = await prisma.url.count({
      where: { shortCode: 'owned-fixture' },
    });
    expect(surviving).toBe(1);
  });

  it('lists only the links of the caller', async () => {
    const { accessToken } = await registerSession('lister@example.com');

    await createLink(accessToken, 'mine-fixture');

    const response = await fetch(`${baseUrl}/api/urls`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const urls = await response.json();

    expect(urls.map((url: { shortCode: string }) => url.shortCode)).toEqual([
      'mine-fixture',
    ]);
  });
});
