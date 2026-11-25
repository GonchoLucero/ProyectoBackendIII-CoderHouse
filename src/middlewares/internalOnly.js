import config from '../config/index.js';
import { InternalEndpointDisabledError } from '../errors/index.js';

export const internalOnly = (req, res, next) => {
  if (config.internalEndpointsEnabled) return next();
  return next(new InternalEndpointDisabledError(req.originalUrl));
};
