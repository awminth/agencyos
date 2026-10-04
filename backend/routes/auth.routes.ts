import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.post('/login', asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.post('/heartbeat', asyncHandler(authController.heartbeat));

export default router;
