import { env } from './env';
import type { CorsOptions } from 'cors';

export const corsOptions: CorsOptions = {
  /**
   * The browser sends Origin as scheme://host:port, so a CLIENT_URL carrying a
   * trailing slash or a path would never match a plain string comparison
   */
  origin: new URL(env.CLIENT_URL).origin,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
};
