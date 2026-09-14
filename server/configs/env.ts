import { z } from 'zod';

/**
 * Single source for environment configuration. Parsed once at import time so a
 * misconfigured process fails on boot instead of on the first request.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z
    .url('CLIENT_URL must be a valid URL')
    .default('http://localhost:8080'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  // Reset mail is sent through Resend's HTTP API, so there is no SMTP to configure
  RESEND_API_KEY: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).default('URL Shortener <onboarding@resend.dev>'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema
  // Without a key no reset mail can leave the process, which is tolerable while
  // developing (the link is logged instead) but silent breakage in production
  .refine(
    (env) => env.NODE_ENV !== 'production' || Boolean(env.RESEND_API_KEY),
    {
      path: ['RESEND_API_KEY'],
      error: 'RESEND_API_KEY is required in production',
    },
  )
  .safeParse(process.env);

if (!parsed.success) {
  console.error(
    `❌ Invalid environment configuration:\n${z.prettifyError(parsed.error)}`,
  );
  process.exit(1);
}

export const env = parsed.data;
