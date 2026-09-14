import sessionRepository from '../../repositories/session';
import passwordResetRepository from '../../repositories/password-reset';
import { BadRequestError } from '../../errors';
import { hashPassword } from '../../utils/password';
import { hashResetToken } from '../../utils/tokens';

const INVALID_RESET_TOKEN = 'Invalid or expired reset token';

type ResetPasswordCommand = {
  token: string;
  password: string;
};

/**
 * Spends a reset token on a new password. Whoever held the old one, and every
 * session opened with it, is cut off: the account has just been proven to be
 * out of its owner's sole control, so nothing issued before is trusted.
 */
const resetPassword = async ({ token, password }: ResetPasswordCommand) => {
  const resetToken = await passwordResetRepository.findByTokenHash(
    hashResetToken(token),
  );

  // Spent, expired and never issued are one answer, so a caller learns nothing
  // about a token beyond whether it works right now
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new BadRequestError(INVALID_RESET_TOKEN);
  }

  // Hashed before the transaction opens: scrypt is deliberately slow, and doing
  // it inside would hold the write lock for the whole of it
  const passwordHash = await hashPassword(password);

  // Retiring the token and setting the password are one step, so two requests
  // arriving with the same token cannot both set one, and a failure cannot burn
  // the token without changing the password. The loser gets a count of zero.
  const spent = await passwordResetRepository.spend(
    resetToken.id,
    resetToken.userId,
    passwordHash,
  );
  if (!spent) throw new BadRequestError(INVALID_RESET_TOKEN);

  await sessionRepository.revokeAllForUser(resetToken.userId);
};

export { resetPassword };
export type { ResetPasswordCommand };
