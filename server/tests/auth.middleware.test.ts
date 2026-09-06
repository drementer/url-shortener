import { describe, expect, it, mock } from 'bun:test';
import { requireAuth, currentUser } from '../middlewares/auth';
import { UnauthorizedError } from '../errors';
import { createAccessToken } from '../utils/tokens';
import type { Request, Response, NextFunction } from 'express';

const USER = { sub: 'user-1', email: 'guarded@example.com' };

/** Only req.get and req.user are read, so the guard needs nothing else */
const request = (authorization?: string) =>
  ({
    get: (name: string) =>
      name.toLowerCase() === 'authorization' ? authorization : undefined,
  }) as unknown as Request;

const run = (authorization?: string) => {
  const req = request(authorization);
  const next = mock<NextFunction>(() => {});

  requireAuth(req, {} as Response, next);

  return { req, next };
};

describe('requireAuth', () => {
  it('attaches the caller and hands the request on', () => {
    const { req, next } = run(`Bearer ${createAccessToken(USER)}`);

    expect(req.user).toEqual({ id: 'user-1', email: USER.email });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a request carrying no authorization at all', () => {
    expect(() => run()).toThrow(UnauthorizedError);
    expect(() => run()).toThrow('Authentication required');
  });

  it('rejects a scheme that is not Bearer', () => {
    // Matched case sensitively, so a lowercase scheme is not accepted either
    expect(() => run('Basic dXNlcjpwYXNz')).toThrow('Authentication required');
    expect(() => run(`bearer ${createAccessToken(USER)}`)).toThrow(
      'Authentication required',
    );
    expect(() => run('Bearer')).toThrow('Authentication required');
  });

  it('tells a missing token apart from one that does not verify', () => {
    expect(() => run('Bearer not-a-real-token')).toThrow(
      'Invalid or expired token',
    );
  });

  it('leaves the request untouched when it rejects', () => {
    const req = request('Bearer not-a-real-token');
    const next = mock<NextFunction>(() => {});

    expect(() => requireAuth(req, {} as Response, next)).toThrow();
    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('currentUser', () => {
  it('reads back what the guard attached', () => {
    const user = { id: 'user-1', email: USER.email };

    expect(currentUser({ user } as Request)).toEqual(user);
  });

  it('throws rather than treating a missing guard as a guest', () => {
    // A route that forgets requireAuth must fail, not run as if signed out
    expect(() => currentUser({} as Request)).toThrow(UnauthorizedError);
  });
});
