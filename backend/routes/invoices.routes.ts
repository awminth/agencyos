import { Router } from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(invoiceController.list));
router.post('/', asyncHandler(invoiceController.create));

// Payment vouchers (static paths before /:id)
router.get('/payments/:paymentId', asyncHandler(invoiceController.getPayment));
router.delete('/payments/:paymentId', asyncHandler(invoiceController.removePayment));
router.get('/:id/payments', asyncHandler(invoiceController.listPayments));
router.post('/:id/payments', asyncHandler(invoiceController.createPayment));

router.put('/:id', asyncHandler(invoiceController.update));
router.delete('/:id', asyncHandler(invoiceController.remove));

export default router;
