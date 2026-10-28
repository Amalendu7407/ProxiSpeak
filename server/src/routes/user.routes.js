import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { avatarUpload } from '../middleware/upload.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/me', UserController.getProfile);
router.patch('/me', UserController.updateProfile);
router.post('/me/avatar', avatarUpload.single('avatar'), UserController.uploadAvatar);
router.delete('/me/avatar', UserController.deleteAvatar);

export default router;
