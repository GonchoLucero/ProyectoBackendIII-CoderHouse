import express from 'express';
import compression from 'compression';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { httpLogger } from './middlewares/httpLogger.js';
import { setupSwagger } from './docs/swagger.js';
import healthRouter from './routes/health.router.js';
import { REQUEST_LIMITS } from './constants/index.js';

const app = express();

app.disable('x-powered-by');
app.use(compression());
app.use(httpLogger);
app.use(express.json({ limit: REQUEST_LIMITS.JSON_BODY }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_LIMITS.JSON_BODY }));

app.use('/health', healthRouter);
setupSwagger(app);
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
