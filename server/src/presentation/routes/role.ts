import express from 'express';
import roleController from '../controllers/role';
import { requireAuth, requireRole } from '../middlewares/auth';
import { rateLimits } from '../middlewares/rate-limit';
import { validateBody } from '../middlewares/validate';
import { createRoleSchema, updateRoleSchema } from '../validators/role';

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/', rateLimits.general, roleController.findAll);
router.get('/:id', rateLimits.general, roleController.findById);
router.post(
  '/',
  rateLimits.general,
  validateBody(createRoleSchema),
  roleController.create,
);
router.patch(
  '/:id',
  rateLimits.general,
  validateBody(updateRoleSchema),
  roleController.update,
);
router.delete('/:id', rateLimits.general, roleController.remove);

export default router;
