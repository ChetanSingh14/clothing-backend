import express from 'express';
import { signup, login, logout, signupOtp, googleLogin } from './auth.controller';
import { validateRequiredFields } from '../../common/middlewares/validation.middleware';
import { authenticateToken } from '../../common/middlewares/auth.middleware';

const router = express.Router();

router.post('/signup-otp', validateRequiredFields(['email']), signupOtp);
router.post('/signup', validateRequiredFields(['name', 'email', 'password', 'otp', 'otpToken']), signup);
router.post('/login', validateRequiredFields(['email', 'password']), login);
router.post('/google', validateRequiredFields(['idToken']), googleLogin);
router.post('/logout', authenticateToken(), logout);

export default router;
export { router as authRoutes };
