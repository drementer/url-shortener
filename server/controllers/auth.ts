import {
  changePassword,
  findCurrentUser,
  login,
  logout,
  refresh,
  register,
  requestPasswordReset,
  resetPassword,
} from '../use-cases/auth';
import { UnauthorizedError } from '../errors';
import { currentUser } from '../middlewares/auth';
import { toUserResponse, toSessionResponse } from '../mappers/auth';
import type { Request, Response } from 'express';

/** Recorded with the session, so a user can tell their own devices apart */
const sessionContext = (req: Request) => ({
  userAgent: req.get('user-agent'),
  ip: req.ip,
});

const authController = {
  async register(req: Request, res: Response) {
    const session = await register(req.body, sessionContext(req));

    res.status(201).json(toSessionResponse(session));
  },

  async login(req: Request, res: Response) {
    const session = await login(req.body, sessionContext(req));

    res.json(toSessionResponse(session));
  },

  async refresh(req: Request, res: Response) {
    const session = await refresh(
      req.body.refreshToken,
      sessionContext(req),
    );

    res.json(toSessionResponse(session));
  },

  async logout(req: Request, res: Response) {
    await logout(req.body.refreshToken);

    res.status(204).end();
  },

  async forgotPassword(req: Request, res: Response) {
    await requestPasswordReset(req.body.email);

    // Answered the same way whether or not the address is registered, so the
    // endpoint cannot be used to find out which addresses have an account
    res.status(202).end();
  },

  async resetPassword(req: Request, res: Response) {
    await resetPassword(req.body);

    res.status(204).end();
  },

  async changePassword(req: Request, res: Response) {
    const session = await changePassword(
      currentUser(req).id,
      req.body,
      sessionContext(req),
    );

    // The change revoked every session, including the one this request came
    // from, so the caller is handed the pair replacing it
    res.json(toSessionResponse(session));
  },

  async me(req: Request, res: Response) {
    const user = await findCurrentUser(currentUser(req).id);

    // The token verifies but the account behind it is gone
    if (!user) throw new UnauthorizedError();

    res.json(toUserResponse(user));
  },
};

export default authController;
