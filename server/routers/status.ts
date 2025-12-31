import express from 'express';
import statusController from '../controllers/status';

const router = express.Router();

router.get('/status', statusController.getStatus);

export default router;
