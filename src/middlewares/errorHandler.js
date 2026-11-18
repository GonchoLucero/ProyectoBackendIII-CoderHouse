import config from '../config/index.js';
import { sendError } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../constants/index.js';

const MONGO_DUPLICATE_KEY = 11000;

export const notFoundHandler = (req, res) => {
  sendError(res, HTTP_STATUS.NOT_FOUND, `Ruta ${req.method} ${req.originalUrl} no encontrada`);
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err.code === MONGO_DUPLICATE_KEY) {
    return sendError(res, HTTP_STATUS.CONFLICT, 'Registro duplicado: ya existe un dato con ese valor único');
  }

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  if (statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR) console.error(err);

  const message =
    statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR && config.isProduction
      ? 'Error interno del servidor'
      : err.message;

  sendError(res, statusCode, message);
};
