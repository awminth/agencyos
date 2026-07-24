import { Router } from 'express';
import * as studentController from '../controllers/studentController.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.get('/', asyncHandler(studentController.list));
router.get('/:id/related', asyncHandler(studentController.getRelated));
router.get('/:id', asyncHandler(studentController.getById));
router.post('/', asyncHandler(studentController.create));
router.put('/:id', asyncHandler(studentController.update));
router.delete('/:id', asyncHandler(studentController.remove));

export default router;
