import orderService from '../services/order.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../constants/index.js';

const getAll = async (req, res) => {
  const { limit, page, status, priority } = req.query;
  const result = await orderService.getOrders({ limit, page, status, priority });
  sendSuccess(res, HTTP_STATUS.OK, result);
};

const getById = async (req, res) => {
  const order = await orderService.getOrderById(req.params.oid);
  sendSuccess(res, HTTP_STATUS.OK, { payload: order });
};

const create = async (req, res) => {
  const result = await orderService.createOrder(req.body);
  sendSuccess(res, HTTP_STATUS.CREATED, { payload: result });
};

export default { getAll, getById, create };
