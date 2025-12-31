import type { CorsOptions } from 'cors';

export const corsOptions: CorsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:8080',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
};

