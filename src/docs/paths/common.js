import { AppError, ERRORS } from '../../errors/index.js';
import { sample } from '../helpers.js';

export const internalError = sample(new AppError(ERRORS.INTERNAL_ERROR));
export const databaseUnavailable = sample(new AppError(ERRORS.DATABASE_UNAVAILABLE));
export const invalidJson = sample(new AppError(ERRORS.INVALID_JSON));
export const serverErrors = { 500: [internalError], 503: [databaseUnavailable] };
