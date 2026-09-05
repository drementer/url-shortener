import express from 'express';
import urlRoutes from './url';
import statusRoutes from './status';
import handleRedirect from '../controllers/redirect';
import { rateLimits } from '../middlewares/rate-limit';

const router = express.Router();

router.use('/api/status', statusRoutes);
router.use('/api/urls', urlRoutes);
router.get('/:code', rateLimits.general, handleRedirect);

export default router;
