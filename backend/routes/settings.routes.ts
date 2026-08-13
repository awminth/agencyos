import { Router } from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/print', asyncHandler(settingsController.getPrint));
router.put('/print', asyncHandler(settingsController.updatePrint));

router.get('/currency', asyncHandler(settingsController.getCurrency));
router.put('/currency', asyncHandler(settingsController.updateCurrency));

router.get('/bank-accounts', asyncHandler(settingsController.listBankAccounts));
router.post('/bank-accounts', asyncHandler(settingsController.createBankAccount));
router.put('/bank-accounts/:id', asyncHandler(settingsController.updateBankAccount));
router.delete('/bank-accounts/:id', asyncHandler(settingsController.deleteBankAccount));

router.get('/variables', asyncHandler(settingsController.listVariables));
router.post('/variables', asyncHandler(settingsController.createVariable));
router.put('/variables/:id', asyncHandler(settingsController.updateVariable));
router.delete('/variables/:id', asyncHandler(settingsController.deleteVariable));

export default router;
