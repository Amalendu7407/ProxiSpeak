import { Router } from 'express';
import { OfficeController } from '../controllers/office.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', OfficeController.listOffices);
router.post('/', OfficeController.createOffice);
router.get('/:identifier', OfficeController.getOffice);

export default router;
