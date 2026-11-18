import config from '../config/index.js';
import { AppError, ERRORS, RouteNotFoundError } from '../errors/index.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';

const MONGO_DUPLICATE_KEY = 11000;
const DB_CONNECTION_ERRORS = ['MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoNetworkError'];

const normalizeError = (err) => {
  if (err instanceof AppError) return err;

  if (err?.type === 'entity.parse.failed') return new AppError(ERRORS.INVALID_JSON);

  if (err?.name === 'CastError') {
    return new AppError(ERRORS.INVALID_ID, {
      message: `El valor "${err.value}" no es válido para "${err.path}"`,
      details: { field: err.path, value: err.value },
    });
  }

  if (err?.name === 'ValidationError' && err.errors) {
    return new AppError(ERRORS.VALIDATION_ERROR, {
      details: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })),
    });
  }

  if (err?.code === MONGO_DUPLICATE_KEY) {
    return new AppError(ERRORS.DUPLICATE_KEY, { details: { fields: Object.keys(err.keyValue ?? {}) } });
  }

  if (DB_CONNECTION_ERRORS.includes(err?.name)) {
    return new AppError(ERRORS.DATABASE_UNAVAILABLE, { cause: err });
  }

  return new AppError(ERRORS.INTERNAL_ERROR, { cause: err });
};

export const notFoundHandler = (req, res, next) => {
  next(new RouteNotFoundError(req.method, req.originalUrl));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);
  const isServerError = error.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR;

  if (isServerError) console.error(`[error] ${error.code}:`, err.cause ?? err);

  const hideInternals = isServerError && config.isProduction;

  const body = {
    status: RESPONSE_STATUS.ERROR,
    error: {
      code: error.code,
      message: hideInternals ? ERRORS[error.code].message : error.message,
      ...(error.details !== undefined && !hideInternals && { details: error.details }),
    },
    method: req.method,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  };

  res.status(error.statusCode).json(body);
};
