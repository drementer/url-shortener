import { UnauthorizedError } from '../errors';
import { verifyAccessToken } from '../utils/tokens';
import type { Request, Response, NextFunction } from 'express';

const BEARER_PREFIX = 'Bearer ';

/**
 * Rejects the request unless it carries a valid access token, and attaches the
 * caller to it. Everything downstream can then treat req.user as given.
 */
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.get('authorization');

  if (!header?.startsWith(BEARER_PREFIX)) throw new UnauthorizedError();

  const payload = verifyAccessToken(header.slice(BEARER_PREFIX.length));

  if (!payload) throw new UnauthorizedError('Invalid or expired token');

  req.user = { id: payload.sub, email: payload.email };
  next();
};

/**
 * Reads the caller requireAuth attached. Throwing rather than asserting keeps a
 * route that forgets the guard from running as if nobody were signed in.
 */
const currentUser = (req: Request) => {
  if (!req.user) throw new UnauthorizedError();

  return req.user;
};

export { requireAuth, currentUser };
