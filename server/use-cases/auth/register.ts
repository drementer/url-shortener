import userRepository from '../../repositories/user';
import { ConflictError, UniqueConstraintError } from '../../errors';
import { hashPassword } from '../../utils/password';
import { startSession } from './session';
import type { Credentials, SessionContext } from './types';

const EMAIL_TAKEN = 'This email is already registered';

/**
 * The lookup below and this insert are two steps, so two requests for the same
 * address can both pass the lookup. The unique constraint is what actually
 * decides, and the loser answers with the same conflict.
 */
const createUser = async (email: string, password: string) => {
  try {
    return await userRepository.create({
      email,
      passwordHash: await hashPassword(password),
    });
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) throw error;

    throw new ConflictError(EMAIL_TAKEN);
  }
};

// Input shape is guaranteed by credentialsSchema at the route level
const register = async (
  { email, password }: Credentials,
  context: SessionContext,
) => {
  // Checked up front so the common case never pays for hashing a password
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new ConflictError(EMAIL_TAKEN);

  const user = await createUser(email, password);

  return await startSession(user, context);
};

export { register };
