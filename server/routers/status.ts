import express from 'express';
import statusController from '../controllers/status';
import { rateLimits } from '../middleware/rate-limit';

const router = express.Router();

router.get('/', rateLimits.general, statusController.getStatus);

export default router;
