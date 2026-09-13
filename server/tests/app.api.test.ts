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

describe('GET /health', () => {
  it('answers ok with the current time', async () => {
    const response = await get('/health');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});

describe('cross origin access', () => {
  it('names the configured client as the allowed origin', async () => {
    const response = await get('/health', { origin: env.CLIENT_URL });

    expect(response.headers.get('access-control-allow-origin')).toBe(
      new URL(env.CLIENT_URL).origin,
    );
    expect(response.headers.get('access-control-allow-credentials')).toBe(
      'true',
    );
  });

  it('answers a preflight with the methods the API serves', async () => {
    const response = await fetch(`${baseUrl}/api/v1/urls`, {
      method: 'OPTIONS',
      headers: {
        'x-forwarded-for': `10.2.1.${++clientCount}`,
        origin: env.CLIENT_URL,
        'access-control-request-method': 'POST',
      },
    });

    const allowed = response.headers.get('access-control-allow-methods');
    expect(allowed?.split(',')).toEqual([
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ]);
  });

  it('never widens the allowed origin for another site', async () => {
    // The browser compares the two itself, so echoing the caller would open it
    const response = await get('/health', {
      origin: 'http://evil.example',
    });

    expect(response.headers.get('access-control-allow-origin')).not.toBe(
      'http://evil.example',
    );
  });
});

describe('response hardening', () => {
  it('sends the headers helmet is mounted for', async () => {
    const response = await get('/health');

    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('does not announce the framework', async () => {
    const response = await get('/health');

    expect(response.headers.get('x-powered-by')).toBeNull();
  });
});

describe('a body the parser refuses', () => {
  const post = (body: string) =>
    fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `10.2.3.${++clientCount}`,
      },
      body,
    });

  it('answers 400 for a body that is not JSON', async () => {
    const response = await post('{not json');

    // The client sent nonsense, which is not a failure of the server
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' });
  });

  it('answers 413 for a body past the 10kb limit', async () => {
    const response = await post(
      JSON.stringify({ email: 'big@example.com', password: 'x'.repeat(20000) }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: 'Request body is too large',
    });
  });
});

describe('media type of the request', () => {
  /**
   * Sent as bytes rather than as a string: the fetch standard gives a string
   * body a Content-Type of its own, which would announce a type the case below
   * is meant to leave out.
   */
  const body = new TextEncoder().encode(
    JSON.stringify({ email: 'a@example.com', password: 'Passw0rd!' }),
  );

  const post = (headers: Record<string, string>) =>
    fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'x-forwarded-for': `10.2.4.${++clientCount}`, ...headers },
      body,
    });

  it('answers 415 for a body announced as another type', async () => {
    const response = await post({ 'content-type': 'text/plain' });

    // Without this the parser would skip the body and a field would look absent
    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({
      error: 'Content-Type must be application/json',
    });
  });

  it('answers 415 for a body that announces no type at all', async () => {
    const response = await post({});

    expect(response.status).toBe(415);
  });

  it('reads a body sent with a charset on the type', async () => {
    const response = await post({
      'content-type': 'application/json; charset=utf-8',
    });

    expect(response.status).not.toBe(415);
  });

  it('lets a request carrying no body through to its own handler', async () => {
    const response = await fetch(`${baseUrl}/api/v1/urls`, {
      method: 'DELETE',
      headers: { 'x-forwarded-for': `10.2.5.${++clientCount}` },
    });

    expect(response.status).toBe(401);
  });
});

describe('media type of the response', () => {
  it('answers 406 when the client rules out JSON', async () => {
    const response = await get('/api/v1/urls', { accept: 'text/csv' });

    expect(response.status).toBe(406);
    // Reported as JSON regardless: it is the only thing the API can write
    expect(await response.json()).toEqual({
      error: 'Only application/json can be produced',
    });
  });

  it('negotiates the health check too, sitting outside the version prefix', async () => {
    const response = await get('/health', { accept: 'text/csv' });

    expect(response.status).toBe(406);
  });

  it('serves a client that accepts anything', async () => {
    const response = await get('/health', { accept: '*/*' });

    expect(response.status).toBe(200);
  });

  it('never varies by Accept, so it says so to no cache', async () => {
    const response = await get('/health', { accept: 'application/json' });

    expect(response.headers.get('vary') ?? '').not.toContain('Accept');
  });

  it('leaves the redirect surface out of the negotiation', async () => {
    // A browser asks for HTML and must still be redirected, not refused
    const response = await fetch(`${baseUrl}/an-unknown-code`, {
      redirect: 'manual',
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'x-forwarded-for': `10.2.6.${++clientCount}`,
      },
    });

    expect(response.status).toBe(302);
  });
});

describe('authentication guard', () => {
  const paths = [
    { method: 'GET', path: '/api/v1/urls' },
    { method: 'GET', path: '/api/v1/urls/some-code' },
    { method: 'POST', path: '/api/v1/urls' },
    { method: 'DELETE', path: '/api/v1/urls/some-code' },
  ];

  it.each(paths)('answers 401 on $method $path unsigned', async (route) => {
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
