import express from 'express';
import apiRouter from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { httpLogger } from './middlewares/httpLogger.js';
import { HTTP_STATUS, RESPONSE_STATUS } from './constants/index.js';

const app = express();

app.use(httpLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.status(HTTP_STATUS.OK).json({ status: RESPONSE_STATUS.SUCCESS }));
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
