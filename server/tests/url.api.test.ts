import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server';
import prisma from '../db/prisma';
import { createAccessToken } from '../utils/tokens';

let server: Server;
let baseUrl: string;
let accessToken: string;

const authHeaders = () => ({
  'content-type': 'application/json',
  authorization: `Bearer ${accessToken}`,
});

const post = (body: unknown) =>
  fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

/** Links are owned, so the suite needs an account to create them as */
const registerFixtureUser = async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'url-api-test@example.com',
      password: 'correct horse battery',
    }),
  });

  const { accessToken } = await response.json();

  return accessToken as string;
};

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

  accessToken = await registerFixtureUser();
});

afterAll(() => {
  server.close();
});

describe('POST /api/urls', () => {
  it('rejects an invalid URL with a field level message', async () => {
    const response = await post({ url: 'not-a-url' });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'A valid URL is required',
      details: [{ path: 'url', message: 'A valid URL is required' }],
    });
  });

  it('rejects a reserved custom slug', async () => {
    const response = await post({
      url: 'https://example.com',
      customSlug: 'api',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'This custom slug is reserved',
      details: [
        { path: 'customSlug', message: 'This custom slug is reserved' },
      ],
    });
  });

  it('answers with the mapped response and no internal fields', async () => {
    const response = await post({
      url: 'https://example.com',
      customSlug: 'api-test',
    });

    expect(response.status).toBe(201);
    // The created resource is advertised at the address it can be read from
    expect(response.headers.get('location')).toBe('/api/urls/api-test');
    expect(Object.keys(await response.json()).sort()).toEqual([
      'clicks',
      'createdAt',
      'expiresAt',
      'originalUrl',
      'shortCode',
    ]);
  });

  it('answers 409 when the custom slug is taken', async () => {
    await post({ url: 'https://example.com', customSlug: 'conflict-fixture' });

    const response = await post({
      url: 'https://other.com',
      customSlug: 'conflict-fixture',
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'This custom slug is already in use',
    });
  });
});

describe('error responses', () => {
  it('answers 404 as JSON for an unknown code', async () => {
    const response = await fetch(`${baseUrl}/api/urls/nothing-here`, {
      headers: authHeaders(),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'URL not found' });
  });

  it('answers 404 as JSON when deleting an unknown code', async () => {
    const response = await fetch(`${baseUrl}/api/urls/nothing-here`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'URL not found' });
  });

  it('answers 404 as JSON for an unknown endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/does-not-exist/here`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Endpoint not found' });
  });
});

describe('DELETE /api/urls/:code', () => {
  it('answers 204 with no body once the link is gone', async () => {
    await post({ url: 'https://example.com', customSlug: 'delete-fixture' });

    const response = await fetch(`${baseUrl}/api/urls/delete-fixture`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    expect(
      await prisma.url.count({ where: { shortCode: 'delete-fixture' } }),
    ).toBe(0);
  });
});

describe('GET /api/urls paging', () => {
  const SLUGS = ['paged-oldest', 'paged-middle', 'paged-newest'];

  let pagerToken: string;

  const listing = (query = '') =>
    fetch(`${baseUrl}/api/urls${query}`, {
      headers: { authorization: `Bearer ${pagerToken}` },
    });

  /**
   * An account of its own, seeded straight through Prisma: the links of the
   * other suites must not land on these pages, and creating them one request
   * at a time would count against the link creation limit.
   */
  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: { email: 'url-paging@example.com', passwordHash: 'unused' },
    });
    pagerToken = createAccessToken({ sub: owner.id, email: owner.email });

    // Written in order and one millisecond apart, so newest first is decidable
    for (const [index, shortCode] of SLUGS.entries()) {
      await prisma.url.create({
        data: {
          shortCode,
          originalUrl: `https://example.com/${shortCode}`,
          userId: owner.id,
          createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, index)),
        },
      });
    }
  });

  it('answers one page inside an envelope carrying the full count', async () => {
    const response = await listing('?page=1&limit=2');
    const { data, meta } = await response.json();

    expect(response.status).toBe(200);
    expect(data.map((url: { shortCode: string }) => url.shortCode)).toEqual([
      'paged-newest',
      'paged-middle',
    ]);
    expect(meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('carries the remainder on the last page', async () => {
    const { data, meta } = await (await listing('?page=2&limit=2')).json();

    expect(data.map((url: { shortCode: string }) => url.shortCode)).toEqual([
      'paged-oldest',
    ]);
    expect(meta.page).toBe(2);
  });

  it('answers an empty page beyond the end rather than failing', async () => {
    const { data, meta } = await (await listing('?page=9&limit=2')).json();

    expect(data).toEqual([]);
    expect(meta.total).toBe(3);
  });

  it('falls back to the first page when no query is given', async () => {
    const { data, meta } = await (await listing()).json();

    expect(data).toHaveLength(3);
    expect(meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it('rejects a limit above the ceiling with a field level message', async () => {
    const response = await listing('?limit=500');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'limit may not exceed 100',
      details: [{ path: 'limit', message: 'limit may not exceed 100' }],
    });
  });

  it('rejects a page that is not a positive whole number', async () => {
    const response = await listing('?page=0');

    expect(response.status).toBe(400);
    expect((await response.json()).details).toEqual([
      { path: 'page', message: 'page must be greater than zero' },
    ]);
  });
});

describe('GET /api/urls', () => {
  it('never exposes visitor IPs in the statistics', async () => {
    await post({ url: 'https://example.com', customSlug: 'stats-fixture' });
    await fetch(`${baseUrl}/stats-fixture`, { redirect: 'manual' });

    const response = await fetch(`${baseUrl}/api/urls/stats-fixture`, {
      headers: authHeaders(),
    });
    const stats = await response.json();

    expect(stats.clicks).toBe(1);
    expect(stats.clickEvents[0]).not.toHaveProperty('ip');
    expect(stats.clickEvents[0]).not.toHaveProperty('urlId');
  });
});
