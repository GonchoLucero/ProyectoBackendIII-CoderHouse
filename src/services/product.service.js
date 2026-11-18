import productRepository from '../repositories/product.repository.js';
import {
  ValidationError,
  MissingFieldsError,
  NoFieldsToUpdateError,
  ProductNotFoundError,
  DuplicateProductCodeError,
} from '../errors/index.js';
import { pick, parsePagination, buildPagination } from '../utils/query.utils.js';
import { PRODUCT_STATUS } from '../constants/index.js';

const UPDATABLE_FIELDS = ['title', 'description', 'price', 'stock', 'category'];

const resolveStatus = (stock) =>
  stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;

const validateNumbers = ({ price, stock }) => {
  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    throw new ValidationError('El precio debe ser un número mayor o igual a 0', { field: 'price', value: price });
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    throw new ValidationError('El stock debe ser un entero mayor o igual a 0', { field: 'stock', value: stock });
  }
};

class ProductService {
  async getProducts({ limit, page, category, includeOutOfStock } = {}) {
    const filter = {};
    if (category) filter.category = category;
    if (!includeOutOfStock) filter.status = PRODUCT_STATUS.AVAILABLE;

    const pg = parsePagination({ limit, page });
    const { items, total } = await productRepository.getAll({ filter, limit: pg.limit, skip: pg.skip });

    return { products: items, pagination: buildPagination({ total, ...pg }) };
  }

  async getProductById(id) {
    const product = await productRepository.getById(id);
    if (!product) throw new ProductNotFoundError(id);
    return product;
  }

  async createProduct(data = {}) {
    const { title, code, price, stock = 0 } = data;
    const missing = ['title', 'code', 'price'].filter((f) => data[f] === undefined || data[f] === '');
    if (missing.length) throw new MissingFieldsError(missing);
    validateNumbers({ price, stock });

    const existing = await productRepository.getByCode(code);
    if (existing) {
      throw new DuplicateProductCodeError(code);
    }

    return productRepository.create({
      ...pick(data, UPDATABLE_FIELDS),
      code,
      stock,
      status: resolveStatus(stock),
    });
  }

  async updateProduct(id, data = {}) {
    const changes = pick(data, UPDATABLE_FIELDS);
    if (Object.keys(changes).length === 0) {
      throw new NoFieldsToUpdateError(UPDATABLE_FIELDS);
    }
    validateNumbers(changes);
    if (changes.stock !== undefined) changes.status = resolveStatus(changes.stock);

    const updated = await productRepository.update(id, changes);
    if (!updated) throw new ProductNotFoundError(id);
    return updated;
  }

  async deleteProduct(id) {
    const deleted = await productRepository.softDelete(id);
    if (!deleted) throw new ProductNotFoundError(id);
    return deleted;
  }
}

export default new ProductService();
