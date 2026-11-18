import userService from '../services/user.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../constants/index.js';

const getAll = async (req, res) => {
  const { limit, page, role } = req.query;
  const result = await userService.getUsers({ limit, page, role });
  sendSuccess(res, HTTP_STATUS.OK, result);
};

const getById = async (req, res) => {
  const user = await userService.getUserById(req.params.uid);
  sendSuccess(res, HTTP_STATUS.OK, { payload: user });
};

const create = async (req, res) => {
  const user = await userService.createUser(req.body);
  sendSuccess(res, HTTP_STATUS.CREATED, { payload: user });
};

const update = async (req, res) => {
  const user = await userService.updateUser(req.params.uid, req.body);
  sendSuccess(res, HTTP_STATUS.OK, { payload: user });
};

const remove = async (req, res) => {
  await userService.deleteUser(req.params.uid);
  res.status(HTTP_STATUS.NO_CONTENT).send();
};

export default { getAll, getById, create, update, remove };
