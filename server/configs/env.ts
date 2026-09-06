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
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    `❌ Invalid environment configuration:\n${z.prettifyError(parsed.error)}`,
  );
  process.exit(1);
}

export const env = parsed.data;
