import type { User } from '../types';

type IssuedSession = {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

/**
 * Shapes the user into the public API contract. Written out field by field so
 * a column added to the user table cannot leak through by itself.
 */
const toUserResponse = (user: User) => ({
  id: user.id,
  email: user.email,
  role: user.role
    ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        maxActiveLinks: user.role.maxActiveLinks,
      }
    : null,
  createdAt: user.createdAt,
});

const toSessionResponse = (session: IssuedSession) => ({
  user: toUserResponse(session.user),
  accessToken: session.accessToken,
  refreshToken: session.refreshToken,
  // Lifetime of the access token in seconds, so the client can refresh in time
  expiresIn: session.expiresIn,
});

export { toUserResponse, toSessionResponse };
