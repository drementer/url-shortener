import express from 'express';
import urlController from '../controllers/url';
import { rateLimits } from '../middleware/rate-limit';
import { validateBody } from '../middleware/validate';
import { createUrlSchema } from '../validators/url';

const router = express.Router();

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
