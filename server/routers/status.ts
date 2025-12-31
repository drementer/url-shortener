import express from 'express';
import statusController from '../controllers/status';

const router = express.Router();

router.get('/', statusController.getStatus);

export default router;
