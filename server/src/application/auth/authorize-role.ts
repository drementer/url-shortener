import userRepository from '../../infrastructure/repositories/user';
import { ForbiddenError } from '../../domain/errors';

/**
 * Confirms the account still holds one of the roles a route demands.
 * Read from storage rather than the token claim, so a demoted account loses
 * access on its next request instead of when its token expires.
 */
const authorizeRole = async (userId: string, allowedRoles: string[]) => {
  const user = await userRepository.findById(userId);
  const currentRole = user?.role?.name;

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    throw new ForbiddenError('Insufficient permissions');
  }
};

export { authorizeRole };
