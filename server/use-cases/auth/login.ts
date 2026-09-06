import { randomBytes } from 'node:crypto';

import userRepository from '../../repositories/user';
import { UnauthorizedError } from '../../errors';
import { hashPassword, verifyPassword } from '../../utils/password';
import { startSession } from './session';
import type { Credentials, SessionContext } from './types';

const INVALID_CREDENTIALS = 'Invalid email or password';

/**
 * Verified against when the email is unknown, so a login attempt costs the same
 * whether or not the account exists and cannot be timed to enumerate users.
 */
const decoyHash = hashPassword(randomBytes(16).toString('hex'));

const login = async (
  { email, password }: Credentials,
  context: SessionContext,
) => {
  const user = await userRepository.findByEmailWithPassword(email);

  const isValid = await verifyPassword(
    password,
    user ? user.passwordHash : await decoyHash,
  );

  if (!user || !isValid) throw new UnauthorizedError(INVALID_CREDENTIALS);

  const { passwordHash, ...publicUser } = user;

  return await startSession(publicUser, context);
};

export { login };
