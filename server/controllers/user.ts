import type { Request, Response } from 'express';
import { assignUserRole } from '../use-cases/role';
import { toUserResponse } from '../mappers/auth';

const userController = {
  /** Replaces the caller-named user's role outright, or clears it with null */
  async setRole(req: Request, res: Response) {
    const id = req.params.id as string;
    const updatedUser = await assignUserRole(id, req.body.roleId);

    res.json(toUserResponse(updatedUser));
  },
};

export default userController;
