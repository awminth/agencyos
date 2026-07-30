import { Router } from 'express';
import * as helpChatController from '../controllers/helpChatController.js';
import { attachUser, requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.use(attachUser);
router.use(requireAuth);

router.get('/quota', asyncHandler(helpChatController.quota));
router.post('/', asyncHandler(helpChatController.chat));

export default router;
