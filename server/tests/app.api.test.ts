import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import app from '../server';
import { env } from '../configs/env';

let server: Server;
let baseUrl: string;

let clientCount = 0;

const get = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${baseUrl}${path}`, {
    headers: { 'x-forwarded-for': `10.2.0.${++clientCount}`, ...headers },
  });

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

describe('GET /api/status', () => {
  it('answers ok with the current time', async () => {
    const response = await get('/api/status');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});

describe('cross origin access', () => {
  it('names the configured client as the allowed origin', async () => {
    const response = await get('/api/status', { origin: env.CLIENT_URL });

    expect(response.headers.get('access-control-allow-origin')).toBe(
      new URL(env.CLIENT_URL).origin,
    );
    expect(response.headers.get('access-control-allow-credentials')).toBe(
      'true',
    );
  });

  it('answers a preflight with the methods the API serves', async () => {
    const response = await fetch(`${baseUrl}/api/urls`, {
      method: 'OPTIONS',
      headers: {
        'x-forwarded-for': `10.2.1.${++clientCount}`,
        origin: env.CLIENT_URL,
        'access-control-request-method': 'POST',
      },
    });

    const allowed = response.headers.get('access-control-allow-methods');
    expect(allowed?.split(',')).toEqual(['GET', 'POST', 'DELETE', 'OPTIONS']);
  });

  it('never widens the allowed origin for another site', async () => {
    // The browser compares the two itself, so echoing the caller would open it
    const response = await get('/api/status', { origin: 'http://evil.example' });

    expect(response.headers.get('access-control-allow-origin')).not.toBe(
      'http://evil.example',
    );
  });
});

describe('response hardening', () => {
  it('sends the headers helmet is mounted for', async () => {
    const response = await get('/api/status');

    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('does not announce the framework', async () => {
    const response = await get('/api/status');

    expect(response.headers.get('x-powered-by')).toBeNull();
  });
});

describe('authentication guard', () => {
  const paths = [
    { method: 'GET', path: '/api/urls' },
    { method: 'GET', path: '/api/urls/some-code' },
    { method: 'POST', path: '/api/urls' },
    { method: 'DELETE', path: '/api/urls/some-code' },
  ];

  it.each(paths)('answers 401 on $method $path with no token', async (route) => {
    const response = await fetch(`${baseUrl}${route.path}`, {
      method: route.method,
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `10.2.2.${++clientCount}`,
      },
      body: route.method === 'POST' ? '{}' : undefined,
    });

    // Every link route is guarded, so none of them reveals anything first
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required' });
  });
});
