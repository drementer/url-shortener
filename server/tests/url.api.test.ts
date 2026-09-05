import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server';
import prisma from '../db/prisma';

let server: Server;
let baseUrl: string;

const post = (body: unknown) =>
  fetch(`${baseUrl}/api/urls`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  await prisma.click.deleteMany();
  await prisma.url.deleteMany();

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

describe('POST /api/urls', () => {
  it('rejects an invalid URL with a field level message', async () => {
    const response = await post({ url: 'not-a-url' });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'A valid URL is required' });
  });

  it('rejects a reserved custom slug', async () => {
    const response = await post({ url: 'https://example.com', customSlug: 'api' });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'This custom slug is reserved',
    });
  });

  it('answers with the mapped response and no internal fields', async () => {
    const response = await post({
      url: 'https://example.com',
      customSlug: 'api-test',
    });

    expect(response.status).toBe(201);
    expect(Object.keys(await response.json()).sort()).toEqual([
      'clicks',
      'createdAt',
      'expiresAt',
      'id',
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
    const response = await fetch(`${baseUrl}/api/urls/nothing-here`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'URL not found' });
  });

  it('answers 404 as JSON when deleting an unknown code', async () => {
    const response = await fetch(`${baseUrl}/api/urls/nothing-here`, {
      method: 'DELETE',
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

describe('GET /api/urls', () => {
  it('never exposes visitor IPs in the statistics', async () => {
    await post({ url: 'https://example.com', customSlug: 'stats-fixture' });
    await fetch(`${baseUrl}/stats-fixture`, { redirect: 'manual' });

    const response = await fetch(`${baseUrl}/api/urls/stats-fixture`);
    const stats = await response.json();

    expect(stats.clicks).toBe(1);
    expect(stats.clickEvents[0]).not.toHaveProperty('ip');
    expect(stats.clickEvents[0]).not.toHaveProperty('urlId');
  });
});
