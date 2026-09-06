import {
  findCurrentUser,
  login,
  logout,
  refresh,
  register,
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

    res.json({ message: 'Logged out successfully' });
  },

  async me(req: Request, res: Response) {
    const user = await findCurrentUser(currentUser(req).id);

    // The token verifies but the account behind it is gone
    if (!user) throw new UnauthorizedError();

    res.json(toUserResponse(user));
  },
};

export default authController;
