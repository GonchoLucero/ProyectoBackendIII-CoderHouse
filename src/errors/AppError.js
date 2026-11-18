import { ERRORS } from './errorDictionary.js';

export default class AppError extends Error {
  constructor(definition = ERRORS.INTERNAL_ERROR, { message, details, cause } = {}) {
    super(message ?? definition.message, cause ? { cause } : undefined);
    this.name = this.constructor.name;
    this.code = definition.code;
    this.statusCode = definition.status;
    this.details = details;
  }
}
