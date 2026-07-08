import express from 'express';
import { handleResendWebhook } from './resend.controller';
import { handleNimbuspostWebhook } from './nimbuspost.controller';

const router = express.Router();

router.post('/resend', handleResendWebhook);
router.post('/nimbuspost', handleNimbuspostWebhook);


export { router as webhooksRoutes };
