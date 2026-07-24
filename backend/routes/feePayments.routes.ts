import { Router } from 'express';
import * as feePaymentController from '../controllers/feePaymentController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(feePaymentController.list));
router.get('/summaries', asyncHandler(feePaymentController.summaries));
router.post('/', asyncHandler(feePaymentController.create));
router.put('/:id', asyncHandler(feePaymentController.update));
router.delete('/:id', asyncHandler(feePaymentController.remove));

export default router;
