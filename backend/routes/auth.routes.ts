import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.post('/login', asyncHandler(authController.login));

export default router;
