import express from 'express';
import urlController from '../controllers/url';
import { requireAuth } from '../middlewares/auth';
import { rateLimits } from '../middlewares/rate-limit';
import { validateBody } from '../middlewares/validate';
import { createUrlSchema } from '../validators/url';

const router = express.Router();

// Every link belongs to a user, so none of these routes is public
router.use(requireAuth);

router.get('/', rateLimits.general, urlController.findAll);
router.get('/:code', rateLimits.general, urlController.stats);
router.post(
  '/',
  rateLimits.linkCreate,
  validateBody(createUrlSchema),
  urlController.create,
);
router.delete('/:code', rateLimits.linkDelete, urlController.remove);

export default router;
