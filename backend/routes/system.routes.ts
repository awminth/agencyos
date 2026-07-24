import { Router } from 'express';
import * as systemController from '../controllers/systemController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/health', asyncHandler(systemController.health));
router.get('/schema-architecture', asyncHandler(systemController.schemaArchitecture));

export default router;
