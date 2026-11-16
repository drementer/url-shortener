import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Counts against the signed in user rather than the address they come from, so
 * one office network does not share a single quota. Falls back to the IP for
 * routes reached before authentication.
 */
const userKey = (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? '');

const rateLimits = {
  general: rateLimit({
    windowMs: 60 * 1000,
    limit: 150,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: 'draft-6',
    legacyHeaders: false,
  }),

  linkCreate: rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    message: { error: 'URL creation limit reached, try again later' },
    standardHeaders: 'draft-6',
    legacyHeaders: false,
    keyGenerator: userKey,
  }),

  // Tight on purpose: this is what a password guessing attempt runs into
  authAttempt: rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: 'draft-6',
    legacyHeaders: false,
  }),

  linkDelete: rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    message: { error: 'Delete limit reached, try again later' },
    standardHeaders: 'draft-6',
    legacyHeaders: false,
    keyGenerator: userKey,
  }),
};

export { rateLimits };
