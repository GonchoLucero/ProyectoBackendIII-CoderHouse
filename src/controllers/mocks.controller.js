import mocksService from '../services/mocks.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../constants/index.js';

const getUsers = (req, res) => {
  const users = mocksService.getMockUsers(req.query.qty);
  sendSuccess(res, HTTP_STATUS.OK, { payload: users });
};

const getCouriers = (req, res) => {
  const couriers = mocksService.getMockCouriers(req.query.qty);
  sendSuccess(res, HTTP_STATUS.OK, { payload: couriers });
};

const getOrders = (req, res) => {
  const { orders, related } = mocksService.getMockOrders(req.query.qty);
  sendSuccess(res, HTTP_STATUS.OK, { payload: orders, related });
};

const getDeliveries = (req, res) => {
  const { deliveries, related } = mocksService.getMockDeliveries(req.query.qty);
  sendSuccess(res, HTTP_STATUS.OK, { payload: deliveries, related });
};

const getDataset = (req, res) => {
  const { users, couriers, orders } = req.query;
  const dataset = mocksService.getMockDataset({ users, couriers, orders });
  sendSuccess(res, HTTP_STATUS.OK, { payload: dataset });
};

const seed = async (req, res) => {
  const { qty, coleccion } = req.query;
  const result = await mocksService.seed({ qty, coleccion });
  sendSuccess(res, HTTP_STATUS.CREATED, result);
};

const seedAll = async (req, res) => {
  const { users, couriers, orders } = req.query;
  const result = await mocksService.seedAll({ users, couriers, orders });
  sendSuccess(res, HTTP_STATUS.CREATED, result);
};

const clear = async (req, res) => {
  const result = await mocksService.clearMocks();
  sendSuccess(res, HTTP_STATUS.OK, result);
};

export default { getUsers, getCouriers, getOrders, getDeliveries, getDataset, seed, seedAll, clear };
