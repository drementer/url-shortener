import express from 'express';
import urlRoutes from './url';
import authRoutes from './auth';
import roleRoutes from './role';
import userRoutes from './user';
import statusRoutes from './status';
import handleRedirect from '../controllers/redirect';
import { rateLimits } from '../middlewares/rate-limit';

const router = express.Router();

// Resources live under a version, so a breaking change can ship as v2 while
// v1 keeps answering. Only this file knows the prefix; the layers below it
// are version agnostic and shared by every version.
const v1 = express.Router();

v1.use('/auth', authRoutes);
v1.use('/urls', urlRoutes);
v1.use('/roles', roleRoutes);
v1.use('/users', userRoutes);

// Uptime monitors and container probes point here once and are never told
// about an API version, so the health check stays outside the prefix.
router.use('/health', statusRoutes);
router.use('/api/v1', v1);
router.get('/:code', rateLimits.general, handleRedirect);

export default router;
