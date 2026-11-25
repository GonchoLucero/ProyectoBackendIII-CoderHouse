import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { uploadUserDocument } from '../middlewares/upload.js';

const router = Router();

router.get('/', userController.getAll);
router.get('/:uid', userController.getById);
router.post('/', userController.create);
router.put('/:uid', userController.update);
router.delete('/:uid', userController.remove);
router.post('/:uid/documents', uploadUserDocument, userController.uploadDocument);

export default router;
