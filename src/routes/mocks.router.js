import { Router } from 'express';
import mocksController from '../controllers/mocks.controller.js';
import { blockInProduction } from '../middlewares/blockInProduction.js';

const router = Router();

router.get('/users', mocksController.getUsers);
router.get('/couriers', mocksController.getCouriers);
router.get('/orders', mocksController.getOrders);
router.get('/deliveries', mocksController.getDeliveries);
router.get('/dataset', mocksController.getDataset);

router.post('/seed', blockInProduction, mocksController.seed);
router.post('/seed/all', blockInProduction, mocksController.seedAll);
router.delete('/seed', blockInProduction, mocksController.clear);

export default router;
