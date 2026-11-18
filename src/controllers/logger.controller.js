import loggerService from '../services/logger.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../constants/index.js';

const test = (req, res) => {
  const result = loggerService.emitTestLogs();
  sendSuccess(res, HTTP_STATUS.OK, { message: 'Se generó un log de cada nivel', ...result });
};

export default { test };
