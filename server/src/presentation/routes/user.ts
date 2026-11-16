import express from 'express';
import userController from '../controllers/user';
import { requireAuth, requireRole } from '../middlewares/auth';
import { rateLimits } from '../middlewares/rate-limit';
import { validateBody } from '../middlewares/validate';
import { assignRoleSchema } from '../validators/user';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

// A role is a sub-resource of the user, and the body replaces it outright
router.put(
  '/:id/role',
  rateLimits.general,
  validateBody(assignRoleSchema),
  userController.setRole,
);

export default router;
