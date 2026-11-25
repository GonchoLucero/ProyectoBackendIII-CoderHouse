import { Router } from 'express';
import orderController from '../controllers/order.controller.js';
import { uploadReceipt } from '../middlewares/upload.js';

const router = Router();

router.get('/', orderController.getAll);
router.get('/:oid', orderController.getById);
router.post('/', orderController.create);
router.patch('/:oid/status', orderController.updateStatus);
router.post('/:oid/receipts', uploadReceipt, orderController.uploadReceipt);

export default router;
