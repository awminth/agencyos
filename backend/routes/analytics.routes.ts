import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(analyticsController.getStats));

export default router;
