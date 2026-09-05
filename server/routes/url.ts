import express from 'express';
import urlController from '../controllers/url';
import { rateLimits } from '../middlewares/rate-limit';
import { validateBody } from '../middlewares/validate';
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
