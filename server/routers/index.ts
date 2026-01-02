import express from 'express';
import urlRoutes from './url';
import statusRoutes from './status';
import handleRedirect from '../controllers/redirect';
import { rateLimits } from '../middleware/rate-limit';

const router = express.Router();

// Health check endpoint
router.use('/api/status', statusRoutes);
router.use('/api/urls', urlRoutes);
router.get('/:code', rateLimits.general, handleRedirect);

export default router;
