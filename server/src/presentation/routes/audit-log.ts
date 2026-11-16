import express from 'express';
import auditLogController from '../controllers/audit-log';
import { requireAuth, requireRole } from '../middlewares/auth';
import { rateLimits } from '../middlewares/rate-limit';
import { validateQuery } from '../middlewares/validate';
import { listAuditLogsQuerySchema } from '../validators/audit-log';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get(
  '/',
  rateLimits.general,
  validateQuery(listAuditLogsQuerySchema),
  auditLogController.findAll,
);

export default router;
