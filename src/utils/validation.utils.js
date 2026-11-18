import AppError from './AppError.js';
import { HTTP_STATUS } from '../constants/index.js';

export const validateEnum = (value, allowed, name) => {
  if (value !== undefined && !Object.values(allowed).includes(value)) {
    throw new AppError(
      `${name} inválido: "${value}". Opciones: ${Object.values(allowed).join(', ')}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }
};
