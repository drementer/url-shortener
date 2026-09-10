import type { Request, Response } from 'express';
import {
  findAllRoles,
  findRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../use-cases/role';
import { toRoleResponse } from '../mappers/role';

const roleController = {
  async findAll(req: Request, res: Response) {
    const roles = await findAllRoles();
    res.json(roles.map(toRoleResponse));
  },

  async findById(req: Request, res: Response) {
    const id = req.params.id as string;
    const role = await findRoleById(id);
    res.json(toRoleResponse(role));
  },

  async create(req: Request, res: Response) {
    const role = await createRole(req.body);
    res.location(`/api/roles/${role.id}`).status(201).json(toRoleResponse(role));
  },

  async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const role = await updateRole(id, req.body);
    res.json(toRoleResponse(role));
  },

  async remove(req: Request, res: Response) {
    const id = req.params.id as string;
    await deleteRole(id);

    res.status(204).end();
  },
};

export default roleController;
