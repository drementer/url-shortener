import express from 'express';
import roleController from '../controllers/role';
import { requireAuth, requireRole } from '../middlewares/auth';
import { rateLimits } from '../middlewares/rate-limit';
import { validateBody } from '../middlewares/validate';
import { createRoleSchema, updateRoleSchema } from '../validators/role';

const router = express.Router();

router.use(rateLimits.general);
router.use(requireAuth);
router.use(requireRole('ADMIN'));

router.get('/', roleController.findAll);
router.get('/:id', roleController.findById);
router.post(
  '/',
  validateBody(createRoleSchema),
  roleController.create,
);
router.patch(
  '/:id',
  validateBody(updateRoleSchema),
  roleController.update,
);
router.delete('/:id', roleController.remove);

export default router;
