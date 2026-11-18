import config from '../config/index.js';
import { SeedForbiddenError } from '../errors/index.js';

export const blockInProduction = (req, res, next) => {
  if (config.isProduction) return next(new SeedForbiddenError());
  next();
};
