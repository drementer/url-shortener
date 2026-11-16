import { randomBytes } from 'node:crypto';

import userRepository from '../../infrastructure/repositories/user';
import { UnauthorizedError } from '../../domain/errors';
import { AUDIT_ACTIONS } from '../../domain/audit';
import { hashPassword, verifyPassword } from '../../infrastructure/crypto/password';
import { recordAuditEvent } from '../audit';
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

  if (!user || !isValid) {
    await recordAuditEvent({
      action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
      actorId: null,
      actorEmail: email,
      ip: context.ip,
      userAgent: context.userAgent,
    });
    throw new UnauthorizedError(INVALID_CREDENTIALS);
  }

  const { passwordHash, ...publicUser } = user;
  const session = await startSession(publicUser, context);

  await recordAuditEvent({
    action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCEEDED,
    actorId: publicUser.id,
    actorEmail: publicUser.email,
    targetType: 'User',
    targetId: publicUser.id,
    ip: context.ip,
    userAgent: context.userAgent,
  });

  return session;
};

export { login };
