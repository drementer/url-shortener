import { z } from 'zod';
import type {
  ChangePasswordCommand,
  Credentials,
  ResetPasswordCommand,
} from '../use-cases/auth';

const MIN_PASSWORD_LENGTH = 8;
// Bounded because the whole password is fed to scrypt on every login attempt
const MAX_PASSWORD_LENGTH = 128;

// The type message covers a missing field, the length checks a present one
const password = z
  .string('A password is required')
  .min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  )
  .max(
    MAX_PASSWORD_LENGTH,
    `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
  );

// Cleaned up before the format check, otherwise a pasted address carrying a
// stray space would be rejected instead of trimmed. Stored lowercased, so the
// same address cannot be registered twice.
const email = z
  .string('A valid email is required')
  .trim()
  .toLowerCase()
  .pipe(z.email('A valid email is required'));

// Annotated with the service command so the two shapes cannot drift apart
const credentialsSchema: z.ZodType<Credentials> = z.object({
  email,
  password,
});

const forgotPasswordSchema = z.object({ email });

// The new password is held to the same rules as one chosen at registration
const resetPasswordSchema: z.ZodType<ResetPasswordCommand> = z.object({
  // The type message covers a missing field, the min a present but empty one
  token: z.string('Reset token is required').min(1, 'Reset token is required'),
  password,
});

const changePasswordSchema: z.ZodType<ChangePasswordCommand> = z
  .object({
    // Only checked against the stored hash, so the length rules do not apply:
    // an account created before they tightened must still be able to move off
    // its old password
    currentPassword: z
      .string('Current password is required')
      .min(1, 'Current password is required'),
    newPassword: password,
  })
  // Answering 204 to a change that changes nothing would read as success
  .refine((body) => body.currentPassword !== body.newPassword, {
    path: ['newPassword'],
    error: 'New password must be different from the current one',
  });

const refreshTokenSchema = z.object({
  // The type message covers a missing field, the min a present but empty one
  refreshToken: z
    .string('Refresh token is required')
    .min(1, 'Refresh token is required'),
});

export {
  credentialsSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};
