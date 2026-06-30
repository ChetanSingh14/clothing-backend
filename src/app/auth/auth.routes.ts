import express from 'express';
import { signup, login, logout } from './auth.controller';
import { validateRequiredFields } from '../../common/middlewares/validation.middleware';
import { authenticateToken } from '../../common/middlewares/auth.middleware';

const router = express.Router();

router.post('/signup', validateRequiredFields(['name', 'email', 'password']), signup);
router.post('/login', validateRequiredFields(['email', 'password']), login);
router.post('/logout', authenticateToken(), logout);

export default router;
export { router as authRoutes };
