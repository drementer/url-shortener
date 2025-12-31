import express from 'express';
import urlRoutes from './url';
import statusRoutes from './status';
import handleRedirect from '../controllers/redirect';

const router = express.Router();

// Health check endpoint
router.use('/api/status', statusRoutes);
router.use('/api/url', urlRoutes);
router.get('/:code', handleRedirect);

export default router;
