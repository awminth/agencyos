import { Router } from 'express';
import * as pushController from '../controllers/pushController.js';
import { attachUser, requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/vapid-public-key', asyncHandler(pushController.getVapidPublicKey));

router.use(attachUser);
router.post('/subscribe', requireAuth, asyncHandler(pushController.subscribe));
router.delete('/subscribe', requireAuth, asyncHandler(pushController.unsubscribe));
router.post('/test', requireAuth, asyncHandler(pushController.testPush));
router.post('/dispatch', requireAuth, asyncHandler(pushController.dispatchNow));

export default router;
