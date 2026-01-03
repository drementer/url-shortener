import rateLimit from 'express-rate-limit';

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
  }),

  linkDelete: rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    message: { error: 'Delete limit reached, try again later' },
    standardHeaders: 'draft-6',
    legacyHeaders: false,
  }),
};

export { rateLimits };
