import express from 'express';
import urlRoutes from './url';
import authRoutes from './auth';
import roleRoutes from './role';
import statusRoutes from './status';
import handleRedirect from '../controllers/redirect';
import { rateLimits } from '../middlewares/rate-limit';

const router = express.Router();

router.use('/api/status', statusRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/urls', urlRoutes);
router.use('/api/roles', roleRoutes);
router.get('/:code', rateLimits.general, handleRedirect);

export default router;
