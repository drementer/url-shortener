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
 * Every request claims its own address. The reset routes allow 10 attempts per
 * 15 minutes and the whole file shares one limiter, so tests coming from a
 * single address would start answering 429 halfway through.
 */
const post = (path: string, body: unknown) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': `10.1.0.${++clientCount}`,
    },
    body: JSON.stringify(body),
  });

/** The token only exists in the mail, so the sender is what the tests read */
const sentTokens: string[] = [];
mailer.sendPasswordReset = async (_to: string, token: string) => {
  sentTokens.push(token);
};

const register = (email: string, password = PASSWORD) =>
  post('/api/v1/auth/register', { email, password });

const login = (email: string, password: string) =>
  post('/api/v1/auth/login', { email, password });

const forgot = (email: string) =>
  post('/api/v1/auth/password/forgot', { email });

const reset = (token: string, password = NEW_PASSWORD) =>
  post('/api/v1/auth/password/reset', { token, password });

/** Registers an account, asks for a reset, and hands back the mailed token */
const requestReset = async (email: string) => {
  await register(email);
  await forgot(email);

  return sentTokens.at(-1) as string;
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

describe('POST /api/v1/auth/password/forgot', () => {
  it('mails a token to a registered address', async () => {
    const before = sentTokens.length;
    await register('forgot@example.com');

    const response = await forgot('forgot@example.com');

    expect(response.status).toBe(202);
    expect(sentTokens.length).toBe(before + 1);
  });

  it('stores the token hashed, never in the clear', async () => {
    const token = await requestReset('hashed@example.com');

    const stored = await prisma.passwordResetToken.findFirst({
      where: { user: { email: 'hashed@example.com' } },
    });

    expect(stored).not.toBeNull();
    expect(stored?.tokenHash).not.toBe(token);
  });

  it('answers the same way for an address with no account', async () => {
    const before = sentTokens.length;

    const response = await forgot('nobody@example.com');

    expect(response.status).toBe(202);
    expect(sentTokens.length).toBe(before);
  });

  it('retires the previous token when a second reset is asked for', async () => {
    const first = await requestReset('twice@example.com');
    await forgot('twice@example.com');
    const second = sentTokens.at(-1) as string;

    expect(await (await reset(first)).status).toBe(400);
    expect((await reset(second)).status).toBe(204);
  });

  it('still answers 202 when the mail cannot be sent', async () => {
    await register('undeliverable@example.com');

    const failing = async () => {
      throw new Error('Resend is down');
    };
    const working = mailer.sendPasswordReset;
    mailer.sendPasswordReset = failing;

    const response = await forgot('undeliverable@example.com');
    mailer.sendPasswordReset = working;

    // A failure would otherwise separate a registered address from an unknown
    // one, which both answer 202
    expect(response.status).toBe(202);

    const stored = await prisma.passwordResetToken.findFirst({
      where: { user: { email: 'undeliverable@example.com' } },
    });
    expect(stored).not.toBeNull();
  });

  it('rejects an address that is not an email', async () => {
    const response = await forgot('not-an-email');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'A valid email is required',
      details: [{ path: 'email', message: 'A valid email is required' }],
    });
  });
});

describe('POST /api/v1/auth/password/reset', () => {
  it('sets the new password and refuses the old one', async () => {
    const token = await requestReset('reset@example.com');

    const response = await reset(token);

    expect(response.status).toBe(204);
    expect((await login('reset@example.com', NEW_PASSWORD)).status).toBe(200);
    expect((await login('reset@example.com', PASSWORD)).status).toBe(401);
  });

  it('revokes every session the account had open', async () => {
    const email = 'sessions@example.com';
    const { refreshToken } = await (await register(email)).json();
    await forgot(email);

    await reset(sentTokens.at(-1) as string);

    const response = await post('/api/v1/auth/refresh', { refreshToken });
    expect(response.status).toBe(401);
  });

  it('refuses a token that has already been spent', async () => {
    const token = await requestReset('spent@example.com');
    await reset(token);

    const response = await reset(token, 'yet another password');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Invalid or expired reset token',
    });
  });

  it('refuses a token that has expired', async () => {
    const token = await requestReset('expired@example.com');

    await prisma.passwordResetToken.updateMany({
      where: { user: { email: 'expired@example.com' } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect((await reset(token)).status).toBe(400);
    expect((await login('expired@example.com', PASSWORD)).status).toBe(200);
  });

  it('lets only one of two simultaneous requests spend the token', async () => {
    const token = await requestReset('race@example.com');

    const responses = await Promise.all([
      reset(token, 'the first new password'),
      reset(token, 'the second new password'),
    ]);
    const statuses = responses.map(({ status }) => status).sort();

    expect(statuses).toEqual([204, 400]);

    // Exactly one of the two was applied, so the loser left nothing behind
    const attempts = await Promise.all([
      login('race@example.com', 'the first new password'),
      login('race@example.com', 'the second new password'),
    ]);
    expect(attempts.filter(({ status }) => status === 200).length).toBe(1);
  });

  it('refuses a token that was never issued', async () => {
    const response = await reset('a'.repeat(96));

    expect(response.status).toBe(400);
  });

  it('holds the new password to the same rules as registration', async () => {
    const token = await requestReset('weak@example.com');

    const response = await reset(token, 'short');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Password must be at least 8 characters',
      details: [
        { path: 'password', message: 'Password must be at least 8 characters' },
      ],
    });
  });

  it('rejects a request with no token', async () => {
    const response = await post('/api/v1/auth/password/reset', {
      password: NEW_PASSWORD,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Reset token is required',
      details: [{ path: 'token', message: 'Reset token is required' }],
    });
  });
});
