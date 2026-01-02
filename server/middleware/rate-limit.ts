import rateLimit from 'express-rate-limit';

const rateLimits = {
  // Genel API limiti: 15 dakikada 150 istek
  general: rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 150,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),

  // Link oluşturma: 1 saatte 30 link (spam koruması)
  linkCreate: rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    message: { error: 'URL creation limit reached, try again later' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),

  // Link silme: 1 saatte 10 silme
  linkDelete: rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    message: { error: 'Delete limit reached, try again later' },
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
};

export { rateLimits };
