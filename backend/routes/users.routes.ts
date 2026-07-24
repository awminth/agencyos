import { Router } from 'express';
import * as usersController from '../controllers/usersController.js';
import { attachUser, requireAuth, requireUsersManage } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = Router();

router.use(attachUser);
router.use(requireAuth);
router.use(requireUsersManage);

router.get('/permission-defaults', asyncHandler(usersController.getDefaults));
router.get('/', asyncHandler(usersController.list));
router.post('/', asyncHandler(usersController.create));
router.put('/:id', asyncHandler(usersController.update));
router.delete('/:id', asyncHandler(usersController.remove));

export default router;
