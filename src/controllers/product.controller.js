import productService from '../services/product.service.js';
import { sendSuccess } from '../utils/response.utils.js';
import { HTTP_STATUS } from '../constants/index.js';


const getAll = async (req, res) => {
  const { limit, page, category, includeOutOfStock } = req.query;
  const result = await productService.getProducts({
    limit,
    page,
    category,
    includeOutOfStock: includeOutOfStock === 'true',
  });
  sendSuccess(res, HTTP_STATUS.OK, result);
};

const getById = async (req, res) => {
  const product = await productService.getProductById(req.params.pid);
  sendSuccess(res, HTTP_STATUS.OK, { payload: product });
};

const create = async (req, res) => {
  const product = await productService.createProduct(req.body);
  sendSuccess(res, HTTP_STATUS.CREATED, { payload: product });
};

const update = async (req, res) => {
  const product = await productService.updateProduct(req.params.pid, req.body);
  sendSuccess(res, HTTP_STATUS.OK, { payload: product });
};

const remove = async (req, res) => {
  await productService.deleteProduct(req.params.pid);
  res.status(HTTP_STATUS.NO_CONTENT).send();
};

export default { getAll, getById, create, update, remove };
