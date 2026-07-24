import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/upcoming-invoices', asyncHandler(reportController.upcomingInvoices));
router.get('/outstanding-balances', asyncHandler(reportController.outstandingBalances));
router.get('/contract-expirations', asyncHandler(reportController.contractExpirations));
router.get('/fee-payments', asyncHandler(reportController.feePayments));
router.get('/student-fee-payments', asyncHandler(reportController.studentFeePayments));

export default router;
