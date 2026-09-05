import { z } from 'zod';
import type { Credentials } from '../services/auth';

const MIN_PASSWORD_LENGTH = 8;
// Bounded because the whole password is fed to scrypt on every login attempt
const MAX_PASSWORD_LENGTH = 128;

// Annotated with the service command so the two shapes cannot drift apart
const credentialsSchema: z.ZodType<Credentials> = z.object({
  // Stored lowercased, so the same address cannot be registered twice
  email: z.email('A valid email is required').trim().toLowerCase(),
  // The type message covers a missing field, the length checks a present one
  password: z
    .string('A password is required')
    .min(
      MIN_PASSWORD_LENGTH,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    )
    .max(
      MAX_PASSWORD_LENGTH,
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
    ),
});

const refreshTokenSchema = z.object({
  // The type message covers a missing field, the min a present but empty one
  refreshToken: z
    .string('Refresh token is required')
    .min(1, 'Refresh token is required'),
});

export { credentialsSchema, refreshTokenSchema };
