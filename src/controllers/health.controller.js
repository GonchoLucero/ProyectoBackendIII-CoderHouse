import healthService from '../services/health.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../constants/index.js';

const check = (req, res) => {
  sendSuccess(res, HTTP_STATUS.OK, healthService.getStatus());
};

export default { check };
