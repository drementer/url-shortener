import type { Request, Response } from 'express';
import { findAllAuditLogs } from '../../application/audit';
import { actorContext } from '../middlewares/auth';
import { toPagedAuditLogsResponse } from '../mappers/audit-log';
import type { ListAuditLogsQuery } from '../validators/audit-log';

const auditLogController = {
  async findAll(req: Request, res: Response) {
    const { page, limit, action, actorId, from, to } = res.locals
      .query as ListAuditLogsQuery;

    const logs = await findAllAuditLogs(
      { action, actorId, from, to },
      { page, limit },
      actorContext(req),
    );

    res.json(toPagedAuditLogsResponse(logs, { page, limit }));
  },
};

export default auditLogController;
