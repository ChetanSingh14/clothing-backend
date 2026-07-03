import express from 'express';
import { handleResendWebhook } from './resend.controller';

const router = express.Router();

router.post('/resend', handleResendWebhook);


export { router as webhooksRoutes };
