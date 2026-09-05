import express from 'express';
import authController from '../controllers/auth';
import { requireAuth } from '../middlewares/auth';
import { rateLimits } from '../middlewares/rate-limit';
import { validateBody } from '../middlewares/validate';
import { credentialsSchema, refreshTokenSchema } from '../validators/auth';

const router = express.Router();

router.post(
  '/register',
  rateLimits.authAttempt,
  validateBody(credentialsSchema),
  authController.register,
);
router.post(
  '/login',
  rateLimits.authAttempt,
  validateBody(credentialsSchema),
  authController.login,
);
router.post(
  '/refresh',
  rateLimits.authAttempt,
  validateBody(refreshTokenSchema),
  authController.refresh,
);
router.post(
  '/logout',
  rateLimits.general,
  validateBody(refreshTokenSchema),
  authController.logout,
);
router.get('/me', rateLimits.general, requireAuth, authController.me);

export default router;
