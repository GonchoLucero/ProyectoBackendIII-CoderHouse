import { Router } from 'express';
import deliveryController from '../controllers/delivery.controller.js';
import { uploadReceipt } from '../middlewares/upload.js';

const router = Router();

router.get('/', deliveryController.getAll);
router.get('/:did', deliveryController.getById);
router.post('/:did/receipts', uploadReceipt, deliveryController.uploadReceipt);

export default router;
