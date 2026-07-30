import { Router } from 'express';
import * as workerController from '../controllers/workerController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(workerController.list));
router.post('/import', asyncHandler(workerController.importWorkers));
router.get('/:id/related', asyncHandler(workerController.getRelated));
router.get('/:id', asyncHandler(workerController.getById));
router.post('/', asyncHandler(workerController.create));
router.put('/:id', asyncHandler(workerController.update));
router.delete('/:id', asyncHandler(workerController.remove));

export default router;
