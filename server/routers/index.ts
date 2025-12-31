import express from 'express';
import urlRoutes from './url';
import handleRedirect from '../controllers/redirect';
import statusRoutes from './status';

const router = express.Router();

// Health check endpoint
router.use('/status', statusRoutes);
router.use('/api/url', urlRoutes);
router.get('/:code', handleRedirect);

export default router;
