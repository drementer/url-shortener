import userRepository from '../../repositories/user';
import sessionRepository from '../../repositories/session';
import passwordResetRepository from '../../repositories/password-reset';
import { UnauthorizedError } from '../../errors';
import { hashPassword, verifyPassword } from '../../utils/password';
import { startSession } from './session';
import type { SessionContext } from './types';

const INVALID_CURRENT_PASSWORD = 'Current password is incorrect';

type ChangePasswordCommand = {
  currentPassword: string;
  newPassword: string;
};

/**
 * Changes the password of a signed in account. The current one is asked for
 * again, so a borrowed access token alone cannot take the account over.
 *
 * Everything issued before is cut off: every session is revoked and any reset
 * link still outstanding is retired. The caller is handed a fresh pair in
 * return, so the device making the change stays signed in while the others do
 * not.
 */
const changePassword = async (
  userId: string,
  { currentPassword, newPassword }: ChangePasswordCommand,
  context: SessionContext,
) => {
  const user = await userRepository.findByIdWithPassword(userId);

  // The token verifies but the account behind it is gone
  if (!user) throw new UnauthorizedError();

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) throw new UnauthorizedError(INVALID_CURRENT_PASSWORD);

  await userRepository.updatePassword(user.id, await hashPassword(newPassword));

  await sessionRepository.revokeAllForUser(user.id);
  await passwordResetRepository.invalidateAllForUser(user.id);

  const { passwordHash, ...publicUser } = user;

  return await startSession(publicUser, context);
};

export { changePassword };
export type { ChangePasswordCommand };
