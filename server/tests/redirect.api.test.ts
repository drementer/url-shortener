import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server';
import prisma from '../db/prisma';
import { env } from '../configs/env';
import { resetDatabase, createUser } from './helpers';

let server: Server;
let baseUrl: string;
let ownerId: string;

let clientCount = 0;

/** Behind the general limiter, so every visit comes from its own address */
const visit = (code: string, headers: Record<string, string> = {}) =>
  fetch(`${baseUrl}/${code}`, {
    redirect: 'manual',
    headers: { 'x-forwarded-for': `10.1.0.${++clientCount}`, ...headers },
  });

const createLink = (shortCode: string, expiresAt: Date | null = null) =>
  prisma.url.create({
    data: {
      shortCode,
      originalUrl: 'https://example.com/target',
      expiresAt,
      userId: ownerId,
    },
  });

beforeAll(async () => {
  await resetDatabase();
  ownerId = (await createUser('redirect-owner@example.com')).id;

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

describe('GET /:code', () => {
  it('sends a visitor to the target, without asking who they are', async () => {
    await createLink('live-link');

    const response = await visit('live-link');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/target');
  });

  it('answers 302 rather than 301, so the browser comes back', async () => {
    await createLink('not-cached');

    // A cached permanent redirect would hide repeat clicks and outlive deletion
    const response = await visit('not-cached');

    expect(response.status).toBe(302);
  });

  it('records the visit against the link', async () => {
    const url = await createLink('counted-link');

    await visit('counted-link', {
      'user-agent': 'curl/8',
      referer: 'https://news.example',
    });

    const [click] = await prisma.click.findMany({ where: { urlId: url.id } });
    expect(click).toMatchObject({
      userAgent: 'curl/8',
      referer: 'https://news.example',
    });
    expect(click.ip).toBeString();
  });

  it('sends an unknown code to the not found page of the client', async () => {
    const response = await visit('nothing-here');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${env.CLIENT_URL}/404`);
  });

  it('sends an expired link to the client, naming the code', async () => {
    const url = await createLink('expired-link', new Date('2020-01-01'));

    const response = await visit('expired-link');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      `${env.CLIENT_URL}/expired/expired-link`,
    );
    // A hit on a dead link never reaches the statistics
    expect(await prisma.click.count({ where: { urlId: url.id } })).toBe(0);
  });
});
