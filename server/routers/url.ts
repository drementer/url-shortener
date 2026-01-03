import express from 'express';
import urlController from '../controllers/url';
import { rateLimits } from '../middlewares/rate-limit';

const router = express.Router();

router.get('/', rateLimits.general, urlController.findAll);
router.get('/:code', rateLimits.general, urlController.stats);
router.post('/', rateLimits.linkCreate, urlController.create);
router.delete('/:code', rateLimits.general, urlController.remove);

export default router;
