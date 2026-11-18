import deliveryService from '../services/delivery.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../constants/index.js';

const getAll = async (req, res) => {
  const { limit, page, status } = req.query;
  const result = await deliveryService.getDeliveries({ limit, page, status });
  sendSuccess(res, HTTP_STATUS.OK, result);
};

const getById = async (req, res) => {
  const delivery = await deliveryService.getDeliveryById(req.params.did);
  sendSuccess(res, HTTP_STATUS.OK, { payload: delivery });
};

export default { getAll, getById };
