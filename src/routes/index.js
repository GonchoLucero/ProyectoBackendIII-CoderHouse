import { Router } from 'express';
import productsRouter from './products.router.js';
import usersRouter from './users.router.js';
import ordersRouter from './orders.router.js';
import deliveriesRouter from './deliveries.router.js';
import mocksRouter from './mocks.router.js';
import loggerRouter from './logger.router.js';
import { internalOnly } from '../middlewares/internalOnly.js';

const router = Router();

router.use('/products', productsRouter);
router.use('/users', usersRouter);
router.use('/orders', ordersRouter);
router.use('/deliveries', deliveriesRouter);
router.use('/mocks', internalOnly, mocksRouter);
router.use('/logger', internalOnly, loggerRouter);

export default router;
