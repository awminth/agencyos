import { Router } from 'express';
import * as studentInvoiceController from '../controllers/studentInvoiceController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(studentInvoiceController.list));
router.post('/', asyncHandler(studentInvoiceController.create));

router.get('/payments/:paymentId', asyncHandler(studentInvoiceController.getPayment));
router.delete('/payments/:paymentId', asyncHandler(studentInvoiceController.removePayment));
router.get('/:id/payments', asyncHandler(studentInvoiceController.listPayments));
router.post('/:id/payments', asyncHandler(studentInvoiceController.createPayment));

router.get('/:id', asyncHandler(studentInvoiceController.getById));
router.put('/:id', asyncHandler(studentInvoiceController.update));
router.delete('/:id', asyncHandler(studentInvoiceController.remove));

export default router;
