import type { Request, Response } from 'express';
import {
  findAllRoles,
  findRoleById,
  createRole,
  updateRole,
  assignUserRole,
} from '../use-cases/role';
import {
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
} from '../validators/role';
import { toUserResponse } from '../mappers/auth';

const roleController = {
  async findAll(req: Request, res: Response) {
    const roles = await findAllRoles();
    res.json(roles);
  },

  async findById(req: Request, res: Response) {
    const id = req.params.id as string;
    const role = await findRoleById(id);
    res.json(role);
  },

  async create(req: Request, res: Response) {
    const input = createRoleSchema.parse(req.body);
    const role = await createRole(input);
    res.status(201).json(role);
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const input = updateRoleSchema.parse(req.body);
    const role = await updateRole(id, input);
    res.json(role);
  },

  async assignUserRole(req: Request, res: Response) {
    const userId = req.params.userId as string;
    const { roleId } = assignRoleSchema.parse(req.body);
    const updatedUser = await assignUserRole(userId, roleId);
    res.json(toUserResponse(updatedUser));
  },
};

export default roleController;
