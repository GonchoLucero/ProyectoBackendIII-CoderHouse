import config from '../config/index.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/index.js';

export const blockInProduction = (req, res, next) => {
  if (config.isProduction) {
    return next(
      new AppError('La carga de datos de prueba está deshabilitada en producción', HTTP_STATUS.FORBIDDEN)
    );
  }
  next();
};
