import { RESPONSE_STATUS } from '../constants/index.js';

export const sendSuccess = (res, statusCode, body = {}) =>
  res.status(statusCode).json({ status: RESPONSE_STATUS.SUCCESS, ...body });
