import express from 'express';
import authController from '../controllers/auth';
import { requireAuth } from '../middlewares/auth';
import { rateLimits } from '../middlewares/rate-limit';
import { validateBody } from '../middlewares/validate';
import {
  changePasswordSchema,
  credentialsSchema,
  forgotPasswordSchema,
  refreshTokenSchema,
  resetPasswordSchema,
} from '../validators/auth';

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
/**
 * Both sides of a reset are password guessing surface, so they sit behind the
 * same tight limiter as login.
 */
router.post(
  '/password/forgot',
  rateLimits.authAttempt,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  '/password/reset',
  rateLimits.authAttempt,
  validateBody(resetPasswordSchema),
  authController.resetPassword,
);
/**
 * Behind the same limiter for the same reason: the body carries the current
 * password, so the endpoint is somewhere a stolen access token can be used to
 * guess it.
 */
router.patch(
  '/password',
  rateLimits.authAttempt,
  requireAuth,
  validateBody(changePasswordSchema),
  authController.changePassword,
);
router.get('/me', rateLimits.general, requireAuth, authController.me);

export default router;
