import deliveryService from '../services/delivery.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../constants/index.js';
import uploadService from '../services/upload.service.js';

const getAll = async (req, res) => {
  const { limit, page, status } = req.query;
  const result = await deliveryService.getDeliveries({ limit, page, status });
  sendSuccess(res, HTTP_STATUS.OK, result);
};

const getById = async (req, res) => {
  const delivery = await deliveryService.getDeliveryById(req.params.did);
  sendSuccess(res, HTTP_STATUS.OK, { payload: delivery });
};

const uploadReceipt = async (req, res) => {
  const result = await uploadService.uploadDeliveryReceipt(req.params.did, req.file, req.body);
  sendSuccess(res, HTTP_STATUS.CREATED, { payload: result });
};

export default { getAll, getById, uploadReceipt };
