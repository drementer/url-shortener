import userRepository from '../../repositories/user';
import passwordResetRepository from '../../repositories/password-reset';
import mailer from '../../services/mailer';
import { env } from '../../configs/env';
import { createResetToken, hashResetToken } from '../../utils/tokens';

const MINUTE_IN_MS = 60 * 1000;

/**
 * Starts a reset for the account behind the address. An unknown address is not
 * reported as an error: telling a caller which addresses are registered turns
 * this endpoint into a way to enumerate users.
 *
 * Any reset already outstanding is invalidated first, so asking twice leaves
 * exactly one working link, the newest one.
 */
const requestPasswordReset = async (email: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) return;

  await passwordResetRepository.invalidateAllForUser(user.id);

  const token = createResetToken();

  await passwordResetRepository.create({
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(
      Date.now() + env.PASSWORD_RESET_TTL_MINUTES * MINUTE_IN_MS,
    ),
  });

  // Deliberately not awaited. Waiting on Resend would make a registered address
  // answer hundreds of milliseconds slower than an unknown one, and that gap is
  // the very thing the identical responses are there to hide. A failed send is
  // logged rather than surfaced, for the same reason: an error here would say
  // the account is real. The link simply never arrives and the user asks again.
  void mailer
    .sendPasswordReset(user.email, token)
    .catch((error) =>
      console.error('Password reset mail could not be sent:', error),
    );
};

export { requestPasswordReset };
