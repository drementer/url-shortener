import { UnauthorizedError } from '../../domain/errors';
import { verifyAccessToken } from '../../infrastructure/crypto/tokens';
import { authorizeRole } from '../../application/auth';
import type { AuditActor } from '../../domain/types';
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

  req.user = {
    id: payload.sub,
    email: payload.email,
    ...(payload.role ? { role: payload.role } : {}),
  };
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

/** Reads the authenticated caller alongside request metadata for audit logging */
const actorContext = (req: Request): AuditActor => {
  const user = currentUser(req);

  return {
    id: user.id,
    email: user.email,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };
};

/** Requires the authenticated caller to have one of the specified roles */
const requireRole = (...allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetPath = `${req.method} ${req.originalUrl.split('?')[0]}`;
      await authorizeRole(
        currentUser(req).id,
        allowedRoles,
        actorContext(req),
        targetPath,
      );
      next();
    } catch (error) {
      next(error);
    }
  };
};

export { requireAuth, currentUser, actorContext, requireRole };
