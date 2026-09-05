import { env } from './env';
import type { CorsOptions } from 'cors';

export const corsOptions: CorsOptions = {
  origin: env.CLIENT_URL,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
};
